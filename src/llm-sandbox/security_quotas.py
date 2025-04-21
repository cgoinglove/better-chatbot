"""
Resource quotas and limits for sandbox environments.

This module provides classes and functions for implementing fine-grained
resource limits and quotas in sandbox environments.
"""

import os
import time
import threading
import signal
from typing import Dict, Any, Optional, List, Union, Callable

from .security_profiles import SecurityProfile


class ResourceQuota:
    """Base class for resource quotas."""
    
    def __init__(self, name: str, limit: Union[int, float, str]):
        """
        Initialize a resource quota.
        
        Args:
            name: Name of the quota
            limit: Limit value
        """
        self.name = name
        self.limit = limit
        self.current = 0
        self.peak = 0
        self.exceeded = False
        self.callback = None
    
    def set_callback(self, callback: Callable[[str, Union[int, float, str], Union[int, float, str]], None]):
        """
        Set a callback function to be called when the quota is exceeded.
        
        Args:
            callback: Callback function that takes quota name, limit, and current value
        """
        self.callback = callback
    
    def update(self, value: Union[int, float, str]) -> bool:
        """
        Update the current value of the quota.
        
        Args:
            value: New value
            
        Returns:
            True if the quota is exceeded, False otherwise
        """
        self.current = value
        self.peak = max(self.peak, value) if isinstance(value, (int, float)) else value
        
        # Check if the quota is exceeded
        if self._is_exceeded():
            self.exceeded = True
            if self.callback:
                self.callback(self.name, self.limit, self.current)
            return True
        
        return False
    
    def reset(self):
        """Reset the quota."""
        self.current = 0
        self.exceeded = False
    
    def _is_exceeded(self) -> bool:
        """
        Check if the quota is exceeded.
        
        Returns:
            True if the quota is exceeded, False otherwise
        """
        if isinstance(self.limit, (int, float)) and isinstance(self.current, (int, float)):
            return self.current > self.limit
        return False


class CPUQuota(ResourceQuota):
    """CPU usage quota."""
    
    def __init__(self, limit: float = 1.0):
        """
        Initialize a CPU quota.
        
        Args:
            limit: CPU limit in cores
        """
        super().__init__("cpu", limit)


class MemoryQuota(ResourceQuota):
    """Memory usage quota."""
    
    def __init__(self, limit: Union[int, str] = "256m"):
        """
        Initialize a memory quota.
        
        Args:
            limit: Memory limit (e.g., 256000000, "256m", "1g")
        """
        # Convert string limit to bytes
        if isinstance(limit, str):
            limit = self._parse_memory_limit(limit)
        
        super().__init__("memory", limit)
    
    def _parse_memory_limit(self, limit: str) -> int:
        """
        Parse a memory limit string.
        
        Args:
            limit: Memory limit string (e.g., "256m", "1g")
            
        Returns:
            Memory limit in bytes
        """
        limit = limit.lower()
        
        if limit.endswith("k"):
            return int(float(limit[:-1]) * 1024)
        elif limit.endswith("m"):
            return int(float(limit[:-1]) * 1024 * 1024)
        elif limit.endswith("g"):
            return int(float(limit[:-1]) * 1024 * 1024 * 1024)
        elif limit.endswith("t"):
            return int(float(limit[:-1]) * 1024 * 1024 * 1024 * 1024)
        else:
            try:
                return int(limit)
            except ValueError:
                return 256 * 1024 * 1024  # Default: 256 MB


class DiskQuota(ResourceQuota):
    """Disk usage quota."""
    
    def __init__(self, limit: Union[int, str] = "1g"):
        """
        Initialize a disk quota.
        
        Args:
            limit: Disk limit (e.g., 1000000000, "1g", "500m")
        """
        # Convert string limit to bytes
        if isinstance(limit, str):
            limit = self._parse_disk_limit(limit)
        
        super().__init__("disk", limit)
    
    def _parse_disk_limit(self, limit: str) -> int:
        """
        Parse a disk limit string.
        
        Args:
            limit: Disk limit string (e.g., "1g", "500m")
            
        Returns:
            Disk limit in bytes
        """
        limit = limit.lower()
        
        if limit.endswith("k"):
            return int(float(limit[:-1]) * 1024)
        elif limit.endswith("m"):
            return int(float(limit[:-1]) * 1024 * 1024)
        elif limit.endswith("g"):
            return int(float(limit[:-1]) * 1024 * 1024 * 1024)
        elif limit.endswith("t"):
            return int(float(limit[:-1]) * 1024 * 1024 * 1024 * 1024)
        else:
            try:
                return int(limit)
            except ValueError:
                return 1024 * 1024 * 1024  # Default: 1 GB


class TimeQuota(ResourceQuota):
    """Execution time quota."""
    
    def __init__(self, limit: int = 60):
        """
        Initialize a time quota.
        
        Args:
            limit: Time limit in seconds
        """
        super().__init__("time", limit)
        self.start_time = None
    
    def start(self):
        """Start the timer."""
        self.start_time = time.time()
    
    def update(self, value: Optional[Union[int, float]] = None) -> bool:
        """
        Update the current value of the quota.
        
        Args:
            value: New value (if None, calculate elapsed time)
            
        Returns:
            True if the quota is exceeded, False otherwise
        """
        if value is None and self.start_time is not None:
            value = time.time() - self.start_time
        
        return super().update(value)


class ProcessQuota(ResourceQuota):
    """Process count quota."""
    
    def __init__(self, limit: int = 100):
        """
        Initialize a process quota.
        
        Args:
            limit: Process count limit
        """
        super().__init__("processes", limit)


class NetworkQuota(ResourceQuota):
    """Network usage quota."""
    
    def __init__(self, limit: Union[int, str] = "100m"):
        """
        Initialize a network quota.
        
        Args:
            limit: Network limit (e.g., 100000000, "100m", "1g")
        """
        # Convert string limit to bytes
        if isinstance(limit, str):
            limit = self._parse_network_limit(limit)
        
        super().__init__("network", limit)
        self.rx_bytes = 0
        self.tx_bytes = 0
    
    def _parse_network_limit(self, limit: str) -> int:
        """
        Parse a network limit string.
        
        Args:
            limit: Network limit string (e.g., "100m", "1g")
            
        Returns:
            Network limit in bytes
        """
        limit = limit.lower()
        
        if limit.endswith("k"):
            return int(float(limit[:-1]) * 1024)
        elif limit.endswith("m"):
            return int(float(limit[:-1]) * 1024 * 1024)
        elif limit.endswith("g"):
            return int(float(limit[:-1]) * 1024 * 1024 * 1024)
        else:
            try:
                return int(limit)
            except ValueError:
                return 100 * 1024 * 1024  # Default: 100 MB
    
    def update_rx(self, bytes_received: int) -> bool:
        """
        Update received bytes.
        
        Args:
            bytes_received: Bytes received
            
        Returns:
            True if the quota is exceeded, False otherwise
        """
        self.rx_bytes += bytes_received
        return self.update(self.rx_bytes + self.tx_bytes)
    
    def update_tx(self, bytes_sent: int) -> bool:
        """
        Update sent bytes.
        
        Args:
            bytes_sent: Bytes sent
            
        Returns:
            True if the quota is exceeded, False otherwise
        """
        self.tx_bytes += bytes_sent
        return self.update(self.rx_bytes + self.tx_bytes)


class FileQuota(ResourceQuota):
    """File count quota."""
    
    def __init__(self, limit: int = 1000):
        """
        Initialize a file quota.
        
        Args:
            limit: File count limit
        """
        super().__init__("files", limit)


class ResourceQuotaManager:
    """Manages resource quotas for a sandbox environment."""
    
    def __init__(self):
        """Initialize a resource quota manager."""
        self.quotas = {}
        self.monitoring = False
        self.monitor_thread = None
        self.callback = None
    
    def add_quota(self, quota: ResourceQuota):
        """
        Add a quota to the manager.
        
        Args:
            quota: Resource quota
        """
        self.quotas[quota.name] = quota
        quota.set_callback(self._quota_exceeded_callback)
    
    def set_callback(self, callback: Callable[[str, Union[int, float, str], Union[int, float, str]], None]):
        """
        Set a callback function to be called when any quota is exceeded.
        
        Args:
            callback: Callback function that takes quota name, limit, and current value
        """
        self.callback = callback
    
    def start_monitoring(self, interval: float = 1.0):
        """
        Start monitoring resource usage.
        
        Args:
            interval: Monitoring interval in seconds
        """
        if self.monitoring:
            return
        
        self.monitoring = True
        self.monitor_thread = threading.Thread(target=self._monitor_loop, args=(interval,))
        self.monitor_thread.daemon = True
        self.monitor_thread.start()
    
    def stop_monitoring(self):
        """Stop monitoring resource usage."""
        self.monitoring = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=1.0)
            self.monitor_thread = None
    
    def check_quotas(self) -> List[str]:
        """
        Check all quotas.
        
        Returns:
            List of exceeded quota names
        """
        exceeded = []
        
        for name, quota in self.quotas.items():
            if quota.exceeded:
                exceeded.append(name)
        
        return exceeded
    
    def reset_quotas(self):
        """Reset all quotas."""
        for quota in self.quotas.values():
            quota.reset()
    
    def _quota_exceeded_callback(self, name: str, limit: Union[int, float, str], current: Union[int, float, str]):
        """
        Callback function for when a quota is exceeded.
        
        Args:
            name: Quota name
            limit: Quota limit
            current: Current value
        """
        if self.callback:
            self.callback(name, limit, current)
    
    def _monitor_loop(self, interval: float):
        """
        Monitor resource usage in a loop.
        
        Args:
            interval: Monitoring interval in seconds
        """
        while self.monitoring:
            try:
                self._update_quotas()
            except Exception as e:
                print(f"Error monitoring resource usage: {e}")
            
            time.sleep(interval)
    
    def _update_quotas(self):
        """Update all quotas with current resource usage."""
        # Update time quota
        if "time" in self.quotas:
            self.quotas["time"].update()
        
        # Update other quotas based on the backend
        # This is a placeholder - actual implementation depends on the backend
        pass


class ResourceQuotaProfile(SecurityProfile):
    """Resource quota profile for sandbox environments."""
    
    def __init__(self, 
                cpu_quota: Optional[CPUQuota] = None,
                memory_quota: Optional[MemoryQuota] = None,
                disk_quota: Optional[DiskQuota] = None,
                time_quota: Optional[TimeQuota] = None,
                process_quota: Optional[ProcessQuota] = None,
                network_quota: Optional[NetworkQuota] = None,
                file_quota: Optional[FileQuota] = None):
        """
        Initialize a resource quota profile.
        
        Args:
            cpu_quota: CPU quota
            memory_quota: Memory quota
            disk_quota: Disk quota
            time_quota: Time quota
            process_quota: Process quota
            network_quota: Network quota
            file_quota: File quota
        """
        super().__init__("resource-quotas")
        
        # Create quota manager
        self.quota_manager = ResourceQuotaManager()
        
        # Add quotas
        if cpu_quota:
            self.quota_manager.add_quota(cpu_quota)
        
        if memory_quota:
            self.quota_manager.add_quota(memory_quota)
        
        if disk_quota:
            self.quota_manager.add_quota(disk_quota)
        
        if time_quota:
            self.quota_manager.add_quota(time_quota)
        
        if process_quota:
            self.quota_manager.add_quota(process_quota)
        
        if network_quota:
            self.quota_manager.add_quota(network_quota)
        
        if file_quota:
            self.quota_manager.add_quota(file_quota)
    
    def get_docker_args(self) -> List[str]:
        """
        Get Docker arguments for resource quotas.
        
        Returns:
            List of Docker arguments
        """
        args = []
        
        # CPU quota
        if "cpu" in self.quota_manager.quotas:
            cpu_quota = self.quota_manager.quotas["cpu"]
            args.extend(["--cpus", str(cpu_quota.limit)])
        
        # Memory quota
        if "memory" in self.quota_manager.quotas:
            memory_quota = self.quota_manager.quotas["memory"]
            args.extend(["--memory", f"{memory_quota.limit}"])
        
        # Process quota
        if "processes" in self.quota_manager.quotas:
            process_quota = self.quota_manager.quotas["processes"]
            args.extend(["--pids-limit", str(process_quota.limit)])
        
        # Disk quota
        if "disk" in self.quota_manager.quotas:
            disk_quota = self.quota_manager.quotas["disk"]
            args.extend(["--storage-opt", f"size={disk_quota.limit}"])
        
        return args
    
    def get_kubernetes_args(self) -> Dict[str, Any]:
        """
        Get Kubernetes arguments for resource quotas.
        
        Returns:
            Dictionary of Kubernetes arguments
        """
        args = {}
        resources = {"limits": {}, "requests": {}}
        
        # CPU quota
        if "cpu" in self.quota_manager.quotas:
            cpu_quota = self.quota_manager.quotas["cpu"]
            resources["limits"]["cpu"] = str(cpu_quota.limit)
            resources["requests"]["cpu"] = str(min(cpu_quota.limit, 0.1))
        
        # Memory quota
        if "memory" in self.quota_manager.quotas:
            memory_quota = self.quota_manager.quotas["memory"]
            memory_str = f"{memory_quota.limit}"
            resources["limits"]["memory"] = memory_str
            resources["requests"]["memory"] = memory_str
        
        # Add resources to args
        if resources["limits"] or resources["requests"]:
            args["resources"] = resources
        
        return args


class ProcessLimiter:
    """Limits process execution time."""
    
    def __init__(self, timeout: int = 60):
        """
        Initialize a process limiter.
        
        Args:
            timeout: Timeout in seconds
        """
        self.timeout = timeout
        self.process = None
        self.timer = None
    
    def set_process(self, process):
        """
        Set the process to limit.
        
        Args:
            process: Process to limit
        """
        self.process = process
    
    def start(self):
        """Start the timer."""
        if not self.process:
            return
        
        self.timer = threading.Timer(self.timeout, self._kill_process)
        self.timer.daemon = True
        self.timer.start()
    
    def stop(self):
        """Stop the timer."""
        if self.timer:
            self.timer.cancel()
            self.timer = None
    
    def _kill_process(self):
        """Kill the process."""
        if not self.process:
            return
        
        try:
            # Try to terminate gracefully
            self.process.terminate()
            
            # Wait for a short time
            time.sleep(0.5)
            
            # Force kill if still running
            if self.process.poll() is None:
                if hasattr(signal, 'SIGKILL'):
                    os.kill(self.process.pid, signal.SIGKILL)
                else:
                    self.process.kill()
        except:
            pass


def create_default_resource_quotas() -> ResourceQuotaProfile:
    """
    Create default resource quotas.
    
    Returns:
        Resource quota profile with default quotas
    """
    return ResourceQuotaProfile(
        cpu_quota=CPUQuota(1.0),
        memory_quota=MemoryQuota("256m"),
        disk_quota=DiskQuota("1g"),
        time_quota=TimeQuota(60),
        process_quota=ProcessQuota(100),
        network_quota=NetworkQuota("100m"),
        file_quota=FileQuota(1000)
    )
