"""
Resource monitoring for sandbox environments.

This module provides classes and functions for monitoring resource usage
in sandbox environments, including CPU, memory, and disk usage.
"""

import os
import time
import threading
import subprocess
import psutil
from typing import Dict, Any, Optional, List, Callable


class ResourceUsage:
    """Resource usage information for a process or container."""
    
    def __init__(self):
        """Initialize resource usage."""
        self.cpu_percent = 0.0
        self.memory_bytes = 0
        self.memory_percent = 0.0
        self.disk_read_bytes = 0
        self.disk_write_bytes = 0
        self.execution_time_ms = 0
        self.peak_memory_bytes = 0
        self.peak_cpu_percent = 0.0
        self.samples = 0
    
    def update(self, cpu_percent: float, memory_bytes: int, memory_percent: float,
              disk_read_bytes: int, disk_write_bytes: int, execution_time_ms: int):
        """
        Update resource usage with new values.
        
        Args:
            cpu_percent: CPU usage in percent
            memory_bytes: Memory usage in bytes
            memory_percent: Memory usage in percent
            disk_read_bytes: Disk read in bytes
            disk_write_bytes: Disk write in bytes
            execution_time_ms: Execution time in milliseconds
        """
        self.cpu_percent = cpu_percent
        self.memory_bytes = memory_bytes
        self.memory_percent = memory_percent
        self.disk_read_bytes = disk_read_bytes
        self.disk_write_bytes = disk_write_bytes
        self.execution_time_ms = execution_time_ms
        
        # Update peak values
        self.peak_memory_bytes = max(self.peak_memory_bytes, memory_bytes)
        self.peak_cpu_percent = max(self.peak_cpu_percent, cpu_percent)
        self.samples += 1
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert resource usage to a dictionary."""
        return {
            "cpu_percent": self.cpu_percent,
            "memory_bytes": self.memory_bytes,
            "memory_mb": self.memory_bytes / (1024 * 1024),
            "memory_percent": self.memory_percent,
            "disk_read_bytes": self.disk_read_bytes,
            "disk_write_bytes": self.disk_write_bytes,
            "execution_time_ms": self.execution_time_ms,
            "peak_memory_bytes": self.peak_memory_bytes,
            "peak_memory_mb": self.peak_memory_bytes / (1024 * 1024),
            "peak_cpu_percent": self.peak_cpu_percent,
            "samples": self.samples
        }
    
    def __str__(self) -> str:
        """Return a string representation of resource usage."""
        return (
            f"CPU: {self.cpu_percent:.1f}% (peak: {self.peak_cpu_percent:.1f}%), "
            f"Memory: {self.memory_bytes / (1024 * 1024):.1f} MB "
            f"(peak: {self.peak_memory_bytes / (1024 * 1024):.1f} MB), "
            f"Disk: {self.disk_read_bytes / 1024:.1f} KB read, "
            f"{self.disk_write_bytes / 1024:.1f} KB write, "
            f"Time: {self.execution_time_ms / 1000:.2f} s"
        )


class ResourceMonitor:
    """Base class for resource monitors."""
    
    def __init__(self, interval_ms: int = 100):
        """
        Initialize a resource monitor.
        
        Args:
            interval_ms: Monitoring interval in milliseconds
        """
        self.interval_ms = interval_ms
        self.usage = ResourceUsage()
        self.start_time = 0
        self.monitoring = False
        self.monitor_thread = None
    
    def start(self):
        """Start monitoring resources."""
        if self.monitoring:
            return
        
        self.start_time = time.time()
        self.monitoring = True
        self.monitor_thread = threading.Thread(target=self._monitor_loop)
        self.monitor_thread.daemon = True
        self.monitor_thread.start()
    
    def stop(self) -> ResourceUsage:
        """
        Stop monitoring resources.
        
        Returns:
            The final resource usage
        """
        self.monitoring = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=1.0)
            self.monitor_thread = None
        
        # Update execution time
        execution_time_ms = int((time.time() - self.start_time) * 1000)
        self.usage.execution_time_ms = execution_time_ms
        
        return self.usage
    
    def _monitor_loop(self):
        """Monitor resources in a loop."""
        while self.monitoring:
            try:
                self._update_usage()
            except Exception as e:
                print(f"Error monitoring resources: {e}")
            
            # Sleep for the specified interval
            time.sleep(self.interval_ms / 1000)
    
    def _update_usage(self):
        """Update resource usage. To be implemented by subclasses."""
        raise NotImplementedError("Subclasses must implement _update_usage")


class ProcessResourceMonitor(ResourceMonitor):
    """Resource monitor for a process."""
    
    def __init__(self, pid: int, interval_ms: int = 100):
        """
        Initialize a process resource monitor.
        
        Args:
            pid: Process ID to monitor
            interval_ms: Monitoring interval in milliseconds
        """
        super().__init__(interval_ms)
        self.pid = pid
        self.process = None
        
        try:
            self.process = psutil.Process(pid)
            # Get initial disk I/O counters
            self.initial_io_counters = self.process.io_counters()
        except (psutil.NoSuchProcess, psutil.AccessDenied, AttributeError) as e:
            print(f"Error initializing process monitor: {e}")
    
    def _update_usage(self):
        """Update resource usage for the process."""
        if not self.process:
            return
        
        try:
            # Get CPU and memory usage
            cpu_percent = self.process.cpu_percent(interval=None)
            memory_info = self.process.memory_info()
            memory_bytes = memory_info.rss
            memory_percent = self.process.memory_percent()
            
            # Get disk I/O counters
            io_counters = self.process.io_counters()
            disk_read_bytes = io_counters.read_bytes - self.initial_io_counters.read_bytes
            disk_write_bytes = io_counters.write_bytes - self.initial_io_counters.write_bytes
            
            # Get execution time
            execution_time_ms = int((time.time() - self.start_time) * 1000)
            
            # Update resource usage
            self.usage.update(
                cpu_percent=cpu_percent,
                memory_bytes=memory_bytes,
                memory_percent=memory_percent,
                disk_read_bytes=disk_read_bytes,
                disk_write_bytes=disk_write_bytes,
                execution_time_ms=execution_time_ms
            )
            
        except (psutil.NoSuchProcess, psutil.AccessDenied, AttributeError) as e:
            print(f"Error updating process resource usage: {e}")
            self.monitoring = False


class DockerResourceMonitor(ResourceMonitor):
    """Resource monitor for a Docker container."""
    
    def __init__(self, container_id: str, interval_ms: int = 100):
        """
        Initialize a Docker container resource monitor.
        
        Args:
            container_id: Docker container ID to monitor
            interval_ms: Monitoring interval in milliseconds
        """
        super().__init__(interval_ms)
        self.container_id = container_id
        self.initial_disk_stats = self._get_disk_stats()
    
    def _update_usage(self):
        """Update resource usage for the Docker container."""
        try:
            # Get CPU and memory usage
            stats = self._get_container_stats()
            if not stats:
                return
            
            # Parse CPU usage
            cpu_stats = stats.get("cpu_stats", {})
            precpu_stats = stats.get("precpu_stats", {})
            cpu_usage = cpu_stats.get("cpu_usage", {}).get("total_usage", 0)
            precpu_usage = precpu_stats.get("cpu_usage", {}).get("total_usage", 0)
            system_cpu_usage = cpu_stats.get("system_cpu_usage", 0)
            precpu_system_usage = precpu_stats.get("system_cpu_usage", 0)
            
            cpu_delta = cpu_usage - precpu_usage
            system_delta = system_cpu_usage - precpu_system_usage
            
            if system_delta > 0 and cpu_delta > 0:
                cpu_percent = (cpu_delta / system_delta) * 100.0
            else:
                cpu_percent = 0.0
            
            # Parse memory usage
            memory_stats = stats.get("memory_stats", {})
            memory_bytes = memory_stats.get("usage", 0)
            memory_limit = memory_stats.get("limit", 1)
            memory_percent = (memory_bytes / memory_limit) * 100.0
            
            # Get disk I/O stats
            disk_stats = self._get_disk_stats()
            disk_read_bytes = disk_stats.get("read_bytes", 0) - self.initial_disk_stats.get("read_bytes", 0)
            disk_write_bytes = disk_stats.get("write_bytes", 0) - self.initial_disk_stats.get("write_bytes", 0)
            
            # Get execution time
            execution_time_ms = int((time.time() - self.start_time) * 1000)
            
            # Update resource usage
            self.usage.update(
                cpu_percent=cpu_percent,
                memory_bytes=memory_bytes,
                memory_percent=memory_percent,
                disk_read_bytes=disk_read_bytes,
                disk_write_bytes=disk_write_bytes,
                execution_time_ms=execution_time_ms
            )
            
        except Exception as e:
            print(f"Error updating Docker container resource usage: {e}")
    
    def _get_container_stats(self) -> Dict[str, Any]:
        """
        Get Docker container stats.
        
        Returns:
            Container stats as a dictionary
        """
        try:
            import json
            result = subprocess.run(
                ["docker", "stats", self.container_id, "--no-stream", "--format", "{{json .}}"],
                capture_output=True,
                text=True,
                check=True
            )
            
            if result.stdout:
                return json.loads(result.stdout)
            
            return {}
            
        except Exception as e:
            print(f"Error getting Docker container stats: {e}")
            return {}
    
    def _get_disk_stats(self) -> Dict[str, int]:
        """
        Get Docker container disk I/O stats.
        
        Returns:
            Disk I/O stats as a dictionary
        """
        try:
            import json
            result = subprocess.run(
                ["docker", "exec", self.container_id, "cat", "/proc/self/io"],
                capture_output=True,
                text=True,
                check=False
            )
            
            if result.returncode == 0 and result.stdout:
                stats = {}
                for line in result.stdout.splitlines():
                    if ":" in line:
                        key, value = line.split(":", 1)
                        stats[key.strip()] = int(value.strip())
                
                return {
                    "read_bytes": stats.get("read_bytes", 0),
                    "write_bytes": stats.get("write_bytes", 0)
                }
            
            return {"read_bytes": 0, "write_bytes": 0}
            
        except Exception as e:
            print(f"Error getting Docker container disk stats: {e}")
            return {"read_bytes": 0, "write_bytes": 0}


class KubernetesResourceMonitor(ResourceMonitor):
    """Resource monitor for a Kubernetes pod."""
    
    def __init__(self, pod_name: str, namespace: str = "default", interval_ms: int = 100):
        """
        Initialize a Kubernetes pod resource monitor.
        
        Args:
            pod_name: Kubernetes pod name to monitor
            namespace: Kubernetes namespace
            interval_ms: Monitoring interval in milliseconds
        """
        super().__init__(interval_ms)
        self.pod_name = pod_name
        self.namespace = namespace
    
    def _update_usage(self):
        """Update resource usage for the Kubernetes pod."""
        try:
            # Get CPU and memory usage
            metrics = self._get_pod_metrics()
            if not metrics:
                return
            
            # Parse CPU usage
            cpu_usage = metrics.get("cpu", {}).get("usage", 0)
            cpu_limit = metrics.get("cpu", {}).get("limit", 1)
            cpu_percent = (cpu_usage / cpu_limit) * 100.0
            
            # Parse memory usage
            memory_bytes = metrics.get("memory", {}).get("usage", 0)
            memory_limit = metrics.get("memory", {}).get("limit", 1)
            memory_percent = (memory_bytes / memory_limit) * 100.0
            
            # Get disk I/O stats (not directly available in Kubernetes)
            disk_read_bytes = 0
            disk_write_bytes = 0
            
            # Get execution time
            execution_time_ms = int((time.time() - self.start_time) * 1000)
            
            # Update resource usage
            self.usage.update(
                cpu_percent=cpu_percent,
                memory_bytes=memory_bytes,
                memory_percent=memory_percent,
                disk_read_bytes=disk_read_bytes,
                disk_write_bytes=disk_write_bytes,
                execution_time_ms=execution_time_ms
            )
            
        except Exception as e:
            print(f"Error updating Kubernetes pod resource usage: {e}")
    
    def _get_pod_metrics(self) -> Dict[str, Any]:
        """
        Get Kubernetes pod metrics.
        
        Returns:
            Pod metrics as a dictionary
        """
        try:
            import json
            result = subprocess.run(
                ["kubectl", "top", "pod", self.pod_name, "-n", self.namespace, "--no-headers", "--use-protocol-buffers"],
                capture_output=True,
                text=True,
                check=False
            )
            
            if result.returncode == 0 and result.stdout:
                # Parse the output
                parts = result.stdout.strip().split()
                if len(parts) >= 3:
                    cpu_str = parts[1]
                    memory_str = parts[2]
                    
                    # Parse CPU usage
                    cpu_value = float(cpu_str.rstrip("m"))
                    cpu_usage = cpu_value / 1000  # Convert millicores to cores
                    
                    # Parse memory usage
                    memory_value = float(memory_str.rstrip("Mi"))
                    memory_bytes = memory_value * 1024 * 1024  # Convert Mi to bytes
                    
                    # Get resource limits
                    limits = self._get_pod_limits()
                    cpu_limit = limits.get("cpu", 1)
                    memory_limit = limits.get("memory", memory_bytes)
                    
                    return {
                        "cpu": {
                            "usage": cpu_usage,
                            "limit": cpu_limit
                        },
                        "memory": {
                            "usage": memory_bytes,
                            "limit": memory_limit
                        }
                    }
            
            return {}
            
        except Exception as e:
            print(f"Error getting Kubernetes pod metrics: {e}")
            return {}
    
    def _get_pod_limits(self) -> Dict[str, float]:
        """
        Get Kubernetes pod resource limits.
        
        Returns:
            Resource limits as a dictionary
        """
        try:
            import json
            result = subprocess.run(
                ["kubectl", "get", "pod", self.pod_name, "-n", self.namespace, "-o", "json"],
                capture_output=True,
                text=True,
                check=False
            )
            
            if result.returncode == 0 and result.stdout:
                pod = json.loads(result.stdout)
                containers = pod.get("spec", {}).get("containers", [])
                
                cpu_limit = 1.0
                memory_limit = 1024 * 1024 * 1024  # 1 GB default
                
                for container in containers:
                    limits = container.get("resources", {}).get("limits", {})
                    
                    if "cpu" in limits:
                        cpu_str = limits["cpu"]
                        if cpu_str.endswith("m"):
                            cpu_limit = float(cpu_str.rstrip("m")) / 1000
                        else:
                            cpu_limit = float(cpu_str)
                    
                    if "memory" in limits:
                        memory_str = limits["memory"]
                        if memory_str.endswith("Mi"):
                            memory_limit = float(memory_str.rstrip("Mi")) * 1024 * 1024
                        elif memory_str.endswith("Gi"):
                            memory_limit = float(memory_str.rstrip("Gi")) * 1024 * 1024 * 1024
                        elif memory_str.endswith("Ki"):
                            memory_limit = float(memory_str.rstrip("Ki")) * 1024
                        else:
                            memory_limit = float(memory_str)
                
                return {
                    "cpu": cpu_limit,
                    "memory": memory_limit
                }
            
            return {"cpu": 1.0, "memory": 1024 * 1024 * 1024}
            
        except Exception as e:
            print(f"Error getting Kubernetes pod limits: {e}")
            return {"cpu": 1.0, "memory": 1024 * 1024 * 1024}


def create_resource_monitor(backend: str, identifier: str, namespace: str = "default") -> Optional[ResourceMonitor]:
    """
    Create a resource monitor for the specified backend.
    
    Args:
        backend: Backend type ("process", "docker", "kubernetes")
        identifier: Process ID, container ID, or pod name
        namespace: Kubernetes namespace (only for Kubernetes backend)
        
    Returns:
        A resource monitor instance, or None if the backend is not supported
    """
    if backend == "process":
        try:
            pid = int(identifier)
            return ProcessResourceMonitor(pid)
        except ValueError:
            print(f"Invalid process ID: {identifier}")
            return None
    
    elif backend == "docker":
        return DockerResourceMonitor(identifier)
    
    elif backend == "kubernetes":
        return KubernetesResourceMonitor(identifier, namespace)
    
    else:
        print(f"Unsupported backend: {backend}")
        return None
