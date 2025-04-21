"""
Security profiles for sandbox environments.

This module provides classes and functions for enhancing security in sandbox
environments, including resource limits, seccomp profiles, and network isolation.
"""

import os
import json
import tempfile
from typing import Dict, Any, Optional, List


class SecurityProfile:
    """Base class for security profiles."""
    
    def __init__(self, name: str):
        """
        Initialize a security profile.
        
        Args:
            name: Name of the security profile
        """
        self.name = name
    
    def get_docker_args(self) -> List[str]:
        """
        Get Docker arguments for this security profile.
        
        Returns:
            List of Docker arguments
        """
        return []
    
    def get_kubernetes_args(self) -> Dict[str, Any]:
        """
        Get Kubernetes arguments for this security profile.
        
        Returns:
            Dictionary of Kubernetes arguments
        """
        return {}


class ResourceLimits(SecurityProfile):
    """Resource limits for sandbox environments."""
    
    def __init__(self, 
                cpu_limit: float = 1.0, 
                memory_limit: str = "256m",
                pids_limit: int = 100,
                disk_limit: str = "1g"):
        """
        Initialize resource limits.
        
        Args:
            cpu_limit: CPU limit in cores
            memory_limit: Memory limit (e.g., "256m", "1g")
            pids_limit: Maximum number of processes
            disk_limit: Disk space limit (e.g., "1g", "500m")
        """
        super().__init__("resource-limits")
        self.cpu_limit = cpu_limit
        self.memory_limit = memory_limit
        self.pids_limit = pids_limit
        self.disk_limit = disk_limit
    
    def get_docker_args(self) -> List[str]:
        """
        Get Docker arguments for resource limits.
        
        Returns:
            List of Docker arguments
        """
        args = [
            "--cpus", str(self.cpu_limit),
            "--memory", self.memory_limit,
            "--pids-limit", str(self.pids_limit)
        ]
        
        # Add disk limit if supported
        if self.disk_limit:
            args.extend(["--storage-opt", f"size={self.disk_limit}"])
        
        return args
    
    def get_kubernetes_args(self) -> Dict[str, Any]:
        """
        Get Kubernetes arguments for resource limits.
        
        Returns:
            Dictionary of Kubernetes arguments
        """
        # Convert memory limit to Kubernetes format
        memory = self.memory_limit
        if memory.endswith("m"):
            memory = memory[:-1] + "Mi"
        elif memory.endswith("g"):
            memory = memory[:-1] + "Gi"
        
        return {
            "resources": {
                "limits": {
                    "cpu": str(self.cpu_limit),
                    "memory": memory
                },
                "requests": {
                    "cpu": str(min(self.cpu_limit, 0.1)),
                    "memory": memory
                }
            }
        }


class SeccompProfile(SecurityProfile):
    """Seccomp profile for sandbox environments."""
    
    def __init__(self, profile_type: str = "default"):
        """
        Initialize a seccomp profile.
        
        Args:
            profile_type: Type of seccomp profile ("default", "strict", "custom")
        """
        super().__init__("seccomp")
        self.profile_type = profile_type
        self.profile_path = None
        
        if profile_type == "custom":
            self.profile_path = self._create_custom_profile()
    
    def get_docker_args(self) -> List[str]:
        """
        Get Docker arguments for seccomp profile.
        
        Returns:
            List of Docker arguments
        """
        if self.profile_type == "default":
            return ["--security-opt", "seccomp=unconfined"]
        elif self.profile_type == "strict":
            return ["--security-opt", "seccomp=/etc/docker/seccomp.json"]
        elif self.profile_type == "custom" and self.profile_path:
            return ["--security-opt", f"seccomp={self.profile_path}"]
        
        return []
    
    def get_kubernetes_args(self) -> Dict[str, Any]:
        """
        Get Kubernetes arguments for seccomp profile.
        
        Returns:
            Dictionary of Kubernetes arguments
        """
        if self.profile_type == "default":
            return {
                "securityContext": {
                    "seccompProfile": {
                        "type": "RuntimeDefault"
                    }
                }
            }
        elif self.profile_type == "strict":
            return {
                "securityContext": {
                    "seccompProfile": {
                        "type": "Localhost",
                        "localhostProfile": "profiles/strict.json"
                    }
                }
            }
        
        return {}
    
    def _create_custom_profile(self) -> str:
        """
        Create a custom seccomp profile.
        
        Returns:
            Path to the custom seccomp profile
        """
        # Define a custom seccomp profile that restricts dangerous syscalls
        profile = {
            "defaultAction": "SCMP_ACT_ERRNO",
            "architectures": [
                "SCMP_ARCH_X86_64",
                "SCMP_ARCH_X86",
                "SCMP_ARCH_AARCH64"
            ],
            "syscalls": [
                {
                    "names": [
                        "accept",
                        "access",
                        "arch_prctl",
                        "brk",
                        "capget",
                        "capset",
                        "chdir",
                        "chmod",
                        "chown",
                        "clock_getres",
                        "clock_gettime",
                        "clock_nanosleep",
                        "close",
                        "connect",
                        "copy_file_range",
                        "creat",
                        "dup",
                        "dup2",
                        "dup3",
                        "epoll_create",
                        "epoll_create1",
                        "epoll_ctl",
                        "epoll_pwait",
                        "epoll_wait",
                        "eventfd",
                        "eventfd2",
                        "execve",
                        "execveat",
                        "exit",
                        "exit_group",
                        "faccessat",
                        "fadvise64",
                        "fallocate",
                        "fanotify_mark",
                        "fchdir",
                        "fchmod",
                        "fchmodat",
                        "fchown",
                        "fchownat",
                        "fcntl",
                        "fdatasync",
                        "fgetxattr",
                        "flistxattr",
                        "flock",
                        "fork",
                        "fremovexattr",
                        "fsetxattr",
                        "fstat",
                        "fstatfs",
                        "fsync",
                        "ftruncate",
                        "futex",
                        "getcwd",
                        "getdents",
                        "getdents64",
                        "getegid",
                        "geteuid",
                        "getgid",
                        "getgroups",
                        "getitimer",
                        "getpeername",
                        "getpgid",
                        "getpgrp",
                        "getpid",
                        "getppid",
                        "getpriority",
                        "getrandom",
                        "getresgid",
                        "getresuid",
                        "getrlimit",
                        "getrusage",
                        "getsid",
                        "getsockname",
                        "getsockopt",
                        "gettid",
                        "gettimeofday",
                        "getuid",
                        "getxattr",
                        "inotify_add_watch",
                        "inotify_init",
                        "inotify_init1",
                        "inotify_rm_watch",
                        "io_cancel",
                        "io_destroy",
                        "io_getevents",
                        "io_setup",
                        "io_submit",
                        "ioctl",
                        "kill",
                        "lgetxattr",
                        "link",
                        "linkat",
                        "listen",
                        "listxattr",
                        "llistxattr",
                        "lremovexattr",
                        "lseek",
                        "lsetxattr",
                        "lstat",
                        "madvise",
                        "memfd_create",
                        "mkdir",
                        "mkdirat",
                        "mknod",
                        "mknodat",
                        "mlock",
                        "mmap",
                        "mount",
                        "mprotect",
                        "mremap",
                        "msgctl",
                        "msgget",
                        "msgrcv",
                        "msgsnd",
                        "msync",
                        "munlock",
                        "munmap",
                        "nanosleep",
                        "newfstatat",
                        "open",
                        "openat",
                        "pause",
                        "pipe",
                        "pipe2",
                        "poll",
                        "ppoll",
                        "prctl",
                        "pread64",
                        "preadv",
                        "prlimit64",
                        "pselect6",
                        "pwrite64",
                        "pwritev",
                        "read",
                        "readahead",
                        "readlink",
                        "readlinkat",
                        "readv",
                        "recvfrom",
                        "recvmmsg",
                        "recvmsg",
                        "rename",
                        "renameat",
                        "renameat2",
                        "restart_syscall",
                        "rmdir",
                        "rt_sigaction",
                        "rt_sigprocmask",
                        "rt_sigreturn",
                        "rt_sigsuspend",
                        "sched_get_priority_max",
                        "sched_get_priority_min",
                        "sched_getaffinity",
                        "sched_getparam",
                        "sched_getscheduler",
                        "sched_yield",
                        "select",
                        "semctl",
                        "semget",
                        "semop",
                        "semtimedop",
                        "sendfile",
                        "sendmmsg",
                        "sendmsg",
                        "sendto",
                        "setitimer",
                        "setpgid",
                        "setpriority",
                        "setrlimit",
                        "setsid",
                        "setsockopt",
                        "set_tid_address",
                        "setuid",
                        "shmat",
                        "shmctl",
                        "shmdt",
                        "shmget",
                        "shutdown",
                        "sigaltstack",
                        "socket",
                        "socketpair",
                        "stat",
                        "statfs",
                        "symlink",
                        "symlinkat",
                        "sync",
                        "sync_file_range",
                        "syncfs",
                        "sysinfo",
                        "tgkill",
                        "time",
                        "timer_create",
                        "timer_delete",
                        "timerfd_create",
                        "timerfd_gettime",
                        "timerfd_settime",
                        "timer_getoverrun",
                        "timer_gettime",
                        "timer_settime",
                        "times",
                        "tkill",
                        "truncate",
                        "umask",
                        "uname",
                        "unlink",
                        "unlinkat",
                        "utime",
                        "utimensat",
                        "utimes",
                        "vfork",
                        "wait4",
                        "waitid",
                        "write",
                        "writev"
                    ],
                    "action": "SCMP_ACT_ALLOW"
                }
            ]
        }
        
        # Create a temporary file for the profile
        fd, profile_path = tempfile.mkstemp(suffix=".json", prefix="seccomp-")
        with os.fdopen(fd, "w") as f:
            json.dump(profile, f)
        
        return profile_path


class NetworkIsolation(SecurityProfile):
    """Network isolation for sandbox environments."""
    
    def __init__(self, network_enabled: bool = False, dns_servers: Optional[List[str]] = None):
        """
        Initialize network isolation.
        
        Args:
            network_enabled: Whether to enable network access
            dns_servers: List of DNS servers to use
        """
        super().__init__("network-isolation")
        self.network_enabled = network_enabled
        self.dns_servers = dns_servers or []
    
    def get_docker_args(self) -> List[str]:
        """
        Get Docker arguments for network isolation.
        
        Returns:
            List of Docker arguments
        """
        if not self.network_enabled:
            return ["--network=none"]
        
        args = []
        
        # Add DNS servers if specified
        for dns in self.dns_servers:
            args.extend(["--dns", dns])
        
        return args
    
    def get_kubernetes_args(self) -> Dict[str, Any]:
        """
        Get Kubernetes arguments for network isolation.
        
        Returns:
            Dictionary of Kubernetes arguments
        """
        if not self.network_enabled:
            return {
                "dnsPolicy": "None",
                "hostNetwork": False
            }
        
        if self.dns_servers:
            return {
                "dnsPolicy": "None",
                "dnsConfig": {
                    "nameservers": self.dns_servers
                }
            }
        
        return {}


class SecurityEnhancer:
    """Security enhancer for sandbox environments."""
    
    def __init__(self):
        """Initialize a security enhancer."""
        self.profiles = []
    
    def add_profile(self, profile: SecurityProfile):
        """
        Add a security profile.
        
        Args:
            profile: Security profile to add
        """
        self.profiles.append(profile)
    
    def get_docker_args(self) -> List[str]:
        """
        Get Docker arguments for all security profiles.
        
        Returns:
            List of Docker arguments
        """
        args = []
        for profile in self.profiles:
            args.extend(profile.get_docker_args())
        return args
    
    def get_kubernetes_args(self) -> Dict[str, Any]:
        """
        Get Kubernetes arguments for all security profiles.
        
        Returns:
            Dictionary of Kubernetes arguments
        """
        args = {}
        for profile in self.profiles:
            profile_args = profile.get_kubernetes_args()
            for key, value in profile_args.items():
                if key in args and isinstance(args[key], dict) and isinstance(value, dict):
                    # Merge dictionaries
                    args[key].update(value)
                else:
                    # Set or override value
                    args[key] = value
        return args


def create_default_security_enhancer(
    cpu_limit: float = 1.0,
    memory_limit: str = "256m",
    pids_limit: int = 100,
    network_enabled: bool = False,
    seccomp_profile: str = "default"
) -> SecurityEnhancer:
    """
    Create a default security enhancer.
    
    Args:
        cpu_limit: CPU limit in cores
        memory_limit: Memory limit (e.g., "256m", "1g")
        pids_limit: Maximum number of processes
        network_enabled: Whether to enable network access
        seccomp_profile: Type of seccomp profile ("default", "strict", "custom")
        
    Returns:
        A security enhancer with default profiles
    """
    enhancer = SecurityEnhancer()
    
    # Add resource limits
    enhancer.add_profile(ResourceLimits(
        cpu_limit=cpu_limit,
        memory_limit=memory_limit,
        pids_limit=pids_limit
    ))
    
    # Add network isolation
    enhancer.add_profile(NetworkIsolation(
        network_enabled=network_enabled
    ))
    
    # Add seccomp profile
    enhancer.add_profile(SeccompProfile(
        profile_type=seccomp_profile
    ))
    
    return enhancer
