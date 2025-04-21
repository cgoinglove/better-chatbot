"""
Advanced security features for sandbox environments.

This module provides classes and functions for implementing advanced security
features in sandbox environments, including system call filtering, capability
restrictions, and namespace isolation.
"""

import os
import json
import tempfile
from typing import Dict, Any, Optional, List, Set

from .security_profiles import SecurityProfile


class SystemCallFilter(SecurityProfile):
    """System call filter for sandbox environments."""
    
    def __init__(self, mode: str = "blacklist", syscalls: Optional[List[str]] = None):
        """
        Initialize a system call filter.
        
        Args:
            mode: Filter mode ("blacklist" or "whitelist")
            syscalls: List of system calls to blacklist or whitelist
        """
        super().__init__("syscall-filter")
        self.mode = mode
        self.syscalls = syscalls or []
        
        # Default blacklist of dangerous system calls
        if mode == "blacklist" and not syscalls:
            self.syscalls = [
                "mount", "umount", "umount2", "ptrace", "kexec_load", "kexec_file_load",
                "open_by_handle_at", "init_module", "finit_module", "delete_module",
                "iopl", "ioperm", "swapon", "swapoff", "syslog", "process_vm_readv",
                "process_vm_writev", "sysfs", "reboot", "setns", "unshare", "clone",
                "keyctl", "add_key", "request_key", "mbind", "migrate_pages",
                "move_pages", "set_mempolicy", "get_mempolicy", "perf_event_open"
            ]
        
        # Default whitelist of safe system calls
        if mode == "whitelist" and not syscalls:
            self.syscalls = [
                "read", "write", "open", "close", "stat", "fstat", "lstat", "poll",
                "lseek", "mmap", "mprotect", "munmap", "brk", "rt_sigaction",
                "rt_sigprocmask", "rt_sigreturn", "ioctl", "pread64", "pwrite64",
                "readv", "writev", "access", "pipe", "select", "sched_yield",
                "mremap", "msync", "mincore", "madvise", "shmget", "shmat", "shmctl",
                "dup", "dup2", "pause", "nanosleep", "getitimer", "alarm", "setitimer",
                "getpid", "sendfile", "socket", "connect", "accept", "sendto", "recvfrom",
                "sendmsg", "recvmsg", "shutdown", "bind", "listen", "getsockname",
                "getpeername", "socketpair", "setsockopt", "getsockopt", "clone",
                "fork", "vfork", "execve", "exit", "wait4", "kill", "uname",
                "fcntl", "flock", "fsync", "fdatasync", "truncate", "ftruncate",
                "getdents", "getcwd", "chdir", "fchdir", "rename", "mkdir", "rmdir",
                "creat", "link", "unlink", "symlink", "readlink", "chmod", "fchmod",
                "chown", "fchown", "lchown", "umask", "gettimeofday", "getrlimit",
                "getrusage", "sysinfo", "times", "getuid", "getgid", "setuid", "setgid",
                "geteuid", "getegid", "setpgid", "getppid", "getpgrp", "setsid",
                "setreuid", "setregid", "getgroups", "setgroups", "setresuid", "getresuid",
                "setresgid", "getresgid", "getpgid", "setfsuid", "setfsgid", "getsid",
                "capget", "capset", "rt_sigpending", "rt_sigtimedwait", "rt_sigqueueinfo",
                "rt_sigsuspend", "sigaltstack", "utime", "mknod", "uselib", "personality",
                "ustat", "statfs", "fstatfs", "sysfs", "getpriority", "setpriority",
                "sched_setparam", "sched_getparam", "sched_setscheduler", "sched_getscheduler",
                "sched_get_priority_max", "sched_get_priority_min", "sched_rr_get_interval",
                "mlock", "munlock", "mlockall", "munlockall", "vhangup", "modify_ldt",
                "pivot_root", "prctl", "arch_prctl", "adjtimex", "setrlimit", "chroot",
                "sync", "acct", "settimeofday", "mount", "umount2", "swapon", "swapoff",
                "reboot", "sethostname", "setdomainname", "iopl", "ioperm", "create_module",
                "init_module", "delete_module", "get_kernel_syms", "query_module",
                "quotactl", "nfsservctl", "getpmsg", "putpmsg", "afs_syscall", "tuxcall",
                "security", "gettid", "readahead", "setxattr", "lsetxattr", "fsetxattr",
                "getxattr", "lgetxattr", "fgetxattr", "listxattr", "llistxattr", "flistxattr",
                "removexattr", "lremovexattr", "fremovexattr", "time", "futex", "sched_setaffinity",
                "sched_getaffinity", "set_thread_area", "io_setup", "io_destroy", "io_getevents",
                "io_submit", "io_cancel", "get_thread_area", "lookup_dcookie", "epoll_create",
                "epoll_ctl_old", "epoll_wait_old", "remap_file_pages", "getdents64", "set_tid_address",
                "restart_syscall", "semtimedop", "fadvise64", "timer_create", "timer_settime",
                "timer_gettime", "timer_getoverrun", "timer_delete", "clock_settime", "clock_gettime",
                "clock_getres", "clock_nanosleep", "exit_group", "epoll_wait", "epoll_ctl",
                "tgkill", "utimes", "mbind", "set_mempolicy", "get_mempolicy", "mq_open",
                "mq_unlink", "mq_timedsend", "mq_timedreceive", "mq_notify", "mq_getsetattr",
                "kexec_load", "waitid", "add_key", "request_key", "keyctl", "ioprio_set",
                "ioprio_get", "inotify_init", "inotify_add_watch", "inotify_rm_watch",
                "migrate_pages", "openat", "mkdirat", "mknodat", "fchownat", "futimesat",
                "newfstatat", "unlinkat", "renameat", "linkat", "symlinkat", "readlinkat",
                "fchmodat", "faccessat", "pselect6", "ppoll", "unshare", "set_robust_list",
                "get_robust_list", "splice", "tee", "sync_file_range", "vmsplice", "move_pages",
                "utimensat", "epoll_pwait", "signalfd", "timerfd_create", "eventfd", "fallocate",
                "timerfd_settime", "timerfd_gettime", "accept4", "signalfd4", "eventfd2",
                "epoll_create1", "dup3", "pipe2", "inotify_init1", "preadv", "pwritev",
                "rt_tgsigqueueinfo", "perf_event_open", "recvmmsg", "fanotify_init",
                "fanotify_mark", "prlimit64", "name_to_handle_at", "open_by_handle_at",
                "clock_adjtime", "syncfs", "sendmmsg", "setns", "getcpu", "process_vm_readv",
                "process_vm_writev", "kcmp", "finit_module", "sched_setattr", "sched_getattr",
                "renameat2", "seccomp", "getrandom", "memfd_create", "kexec_file_load",
                "bpf", "execveat", "userfaultfd", "membarrier", "mlock2", "copy_file_range",
                "preadv2", "pwritev2", "pkey_mprotect", "pkey_alloc", "pkey_free", "statx"
            ]
    
    def get_docker_args(self) -> List[str]:
        """
        Get Docker arguments for system call filtering.
        
        Returns:
            List of Docker arguments
        """
        # Create a seccomp profile
        profile_path = self._create_seccomp_profile()
        
        if profile_path:
            return ["--security-opt", f"seccomp={profile_path}"]
        
        return []
    
    def get_kubernetes_args(self) -> Dict[str, Any]:
        """
        Get Kubernetes arguments for system call filtering.
        
        Returns:
            Dictionary of Kubernetes arguments
        """
        # Create a seccomp profile
        profile_path = self._create_seccomp_profile()
        
        if profile_path:
            return {
                "securityContext": {
                    "seccompProfile": {
                        "type": "Localhost",
                        "localhostProfile": profile_path
                    }
                }
            }
        
        return {}
    
    def _create_seccomp_profile(self) -> Optional[str]:
        """
        Create a seccomp profile.
        
        Returns:
            Path to the seccomp profile, or None if creation failed
        """
        try:
            # Create a seccomp profile based on the mode and syscalls
            if self.mode == "blacklist":
                profile = {
                    "defaultAction": "SCMP_ACT_ALLOW",
                    "architectures": [
                        "SCMP_ARCH_X86_64",
                        "SCMP_ARCH_X86",
                        "SCMP_ARCH_AARCH64"
                    ],
                    "syscalls": [
                        {
                            "names": self.syscalls,
                            "action": "SCMP_ACT_ERRNO"
                        }
                    ]
                }
            else:  # whitelist
                profile = {
                    "defaultAction": "SCMP_ACT_ERRNO",
                    "architectures": [
                        "SCMP_ARCH_X86_64",
                        "SCMP_ARCH_X86",
                        "SCMP_ARCH_AARCH64"
                    ],
                    "syscalls": [
                        {
                            "names": self.syscalls,
                            "action": "SCMP_ACT_ALLOW"
                        }
                    ]
                }
            
            # Create a temporary file for the profile
            fd, profile_path = tempfile.mkstemp(suffix=".json", prefix="seccomp-")
            with os.fdopen(fd, "w") as f:
                json.dump(profile, f)
            
            return profile_path
            
        except Exception as e:
            print(f"Error creating seccomp profile: {e}")
            return None


class CapabilityRestriction(SecurityProfile):
    """Capability restriction for sandbox environments."""
    
    def __init__(self, mode: str = "drop", capabilities: Optional[List[str]] = None):
        """
        Initialize a capability restriction.
        
        Args:
            mode: Restriction mode ("drop" or "add")
            capabilities: List of capabilities to drop or add
        """
        super().__init__("capability-restriction")
        self.mode = mode
        self.capabilities = capabilities or []
        
        # Default capabilities to drop
        if mode == "drop" and not capabilities:
            self.capabilities = [
                "CAP_SYS_ADMIN", "CAP_SYS_PTRACE", "CAP_SYS_BOOT", "CAP_SYS_MODULE",
                "CAP_SYS_RAWIO", "CAP_SYS_PACCT", "CAP_SYS_NICE", "CAP_SYS_RESOURCE",
                "CAP_SYS_TIME", "CAP_SYS_TTY_CONFIG", "CAP_AUDIT_CONTROL", "CAP_MAC_ADMIN",
                "CAP_MAC_OVERRIDE", "CAP_NET_ADMIN", "CAP_SYSLOG", "CAP_DAC_READ_SEARCH",
                "CAP_LINUX_IMMUTABLE", "CAP_NET_BROADCAST", "CAP_IPC_LOCK", "CAP_IPC_OWNER",
                "CAP_LEASE", "CAP_WAKE_ALARM", "CAP_BLOCK_SUSPEND"
            ]
        
        # Default capabilities to add
        if mode == "add" and not capabilities:
            self.capabilities = [
                "CAP_CHOWN", "CAP_DAC_OVERRIDE", "CAP_FSETID", "CAP_FOWNER",
                "CAP_MKNOD", "CAP_NET_RAW", "CAP_SETGID", "CAP_SETUID",
                "CAP_SETFCAP", "CAP_SETPCAP", "CAP_NET_BIND_SERVICE",
                "CAP_KILL", "CAP_AUDIT_WRITE"
            ]
    
    def get_docker_args(self) -> List[str]:
        """
        Get Docker arguments for capability restriction.
        
        Returns:
            List of Docker arguments
        """
        args = []
        
        if self.mode == "drop":
            for cap in self.capabilities:
                args.extend(["--cap-drop", cap])
        else:  # add
            # First drop all capabilities
            args.extend(["--cap-drop", "ALL"])
            
            # Then add specific capabilities
            for cap in self.capabilities:
                args.extend(["--cap-add", cap])
        
        return args
    
    def get_kubernetes_args(self) -> Dict[str, Any]:
        """
        Get Kubernetes arguments for capability restriction.
        
        Returns:
            Dictionary of Kubernetes arguments
        """
        security_context = {}
        
        if self.mode == "drop":
            security_context["capabilities"] = {
                "drop": self.capabilities
            }
        else:  # add
            security_context["capabilities"] = {
                "drop": ["ALL"],
                "add": self.capabilities
            }
        
        return {"securityContext": security_context}


class NamespaceIsolation(SecurityProfile):
    """Namespace isolation for sandbox environments."""
    
    def __init__(self, namespaces: Optional[List[str]] = None):
        """
        Initialize namespace isolation.
        
        Args:
            namespaces: List of namespaces to isolate
        """
        super().__init__("namespace-isolation")
        self.namespaces = namespaces or ["ipc", "net", "mount", "pid", "uts"]
    
    def get_docker_args(self) -> List[str]:
        """
        Get Docker arguments for namespace isolation.
        
        Returns:
            List of Docker arguments
        """
        args = []
        
        for ns in self.namespaces:
            if ns == "net":
                args.extend(["--network", "none"])
            elif ns == "pid":
                args.append("--pid=host")
            elif ns == "ipc":
                args.append("--ipc=none")
            elif ns == "uts":
                args.append("--uts=none")
            elif ns == "mount":
                args.append("--mount=type=none")
        
        return args
    
    def get_kubernetes_args(self) -> Dict[str, Any]:
        """
        Get Kubernetes arguments for namespace isolation.
        
        Returns:
            Dictionary of Kubernetes arguments
        """
        args = {}
        
        if "net" in self.namespaces:
            args["hostNetwork"] = False
        
        if "pid" in self.namespaces:
            args["hostPID"] = False
        
        if "ipc" in self.namespaces:
            args["hostIPC"] = False
        
        return args


class PrivilegeRestriction(SecurityProfile):
    """Privilege restriction for sandbox environments."""
    
    def __init__(self, privileged: bool = False, allow_privilege_escalation: bool = False):
        """
        Initialize privilege restriction.
        
        Args:
            privileged: Whether to run as privileged
            allow_privilege_escalation: Whether to allow privilege escalation
        """
        super().__init__("privilege-restriction")
        self.privileged = privileged
        self.allow_privilege_escalation = allow_privilege_escalation
    
    def get_docker_args(self) -> List[str]:
        """
        Get Docker arguments for privilege restriction.
        
        Returns:
            List of Docker arguments
        """
        args = []
        
        if not self.privileged:
            args.append("--security-opt=no-new-privileges")
        else:
            args.append("--privileged")
        
        return args
    
    def get_kubernetes_args(self) -> Dict[str, Any]:
        """
        Get Kubernetes arguments for privilege restriction.
        
        Returns:
            Dictionary of Kubernetes arguments
        """
        return {
            "securityContext": {
                "privileged": self.privileged,
                "allowPrivilegeEscalation": self.allow_privilege_escalation
            }
        }


class ReadOnlyFilesystem(SecurityProfile):
    """Read-only filesystem for sandbox environments."""
    
    def __init__(self, read_only: bool = True, writable_paths: Optional[List[str]] = None):
        """
        Initialize read-only filesystem.
        
        Args:
            read_only: Whether to make the filesystem read-only
            writable_paths: List of paths that should be writable
        """
        super().__init__("read-only-filesystem")
        self.read_only = read_only
        self.writable_paths = writable_paths or ["/tmp", "/var/tmp"]
    
    def get_docker_args(self) -> List[str]:
        """
        Get Docker arguments for read-only filesystem.
        
        Returns:
            List of Docker arguments
        """
        args = []
        
        if self.read_only:
            args.append("--read-only")
            
            # Add writable paths as tmpfs mounts
            for path in self.writable_paths:
                args.extend(["--tmpfs", path])
        
        return args
    
    def get_kubernetes_args(self) -> Dict[str, Any]:
        """
        Get Kubernetes arguments for read-only filesystem.
        
        Returns:
            Dictionary of Kubernetes arguments
        """
        security_context = {"readOnlyRootFilesystem": self.read_only}
        
        # Add writable paths as volume mounts
        volume_mounts = []
        volumes = []
        
        for i, path in enumerate(self.writable_paths):
            name = f"tmpfs-{i}"
            volume_mounts.append({
                "name": name,
                "mountPath": path
            })
            volumes.append({
                "name": name,
                "emptyDir": {
                    "medium": "Memory"
                }
            })
        
        return {
            "securityContext": security_context,
            "volumeMounts": volume_mounts,
            "volumes": volumes
        }


def create_default_security_profiles() -> List[SecurityProfile]:
    """
    Create default security profiles.
    
    Returns:
        List of default security profiles
    """
    return [
        SystemCallFilter(),
        CapabilityRestriction(),
        NamespaceIsolation(),
        PrivilegeRestriction(),
        ReadOnlyFilesystem()
    ]
