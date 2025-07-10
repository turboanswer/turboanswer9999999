import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Search, Ban, Flag, Shield, Users, Eye, AlertTriangle, CheckCircle, Pause, Play, Clock } from 'lucide-react';
import { Link } from 'wouter';

interface User {
  id: number;
  username: string;
  email: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  isBanned: boolean;
  isFlagged: boolean;
  flagReason?: string;
  banReason?: string;
  isSuspended: boolean;
  suspensionReason?: string;
  suspendedBy?: string;
  suspendedAt?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export default function EmployeeDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'banned', 'flagged', 'suspended'
  const queryClient = useQueryClient();

  // Fetch all users
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/employee/users'],
  });

  // Ban user mutation
  const banUserMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: number; reason: string }) =>
      apiRequest('POST', `/api/employee/users/${userId}/ban`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employee/users'] });
    },
  });

  // Unban user mutation
  const unbanUserMutation = useMutation({
    mutationFn: (userId: number) =>
      apiRequest('POST', `/api/employee/users/${userId}/unban`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employee/users'] });
    },
  });

  // Flag user mutation
  const flagUserMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: number; reason: string }) =>
      apiRequest('POST', `/api/employee/users/${userId}/flag`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employee/users'] });
    },
  });

  // Unflag user mutation
  const unflagUserMutation = useMutation({
    mutationFn: (userId: number) =>
      apiRequest('POST', `/api/employee/users/${userId}/unflag`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employee/users'] });
    },
  });

  // Suspend user mutation
  const suspendUserMutation = useMutation({
    mutationFn: ({ userId, reason, employeeId, employeeUsername }: { 
      userId: number; 
      reason: string; 
      employeeId: number; 
      employeeUsername: string; 
    }) =>
      apiRequest('POST', `/api/employee/users/${userId}/suspend`, { 
        reason, 
        employeeId, 
        employeeUsername 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employee/users'] });
    },
  });

  // Unsuspend user mutation
  const unsuspendUserMutation = useMutation({
    mutationFn: ({ userId, employeeId, employeeUsername }: { 
      userId: number; 
      employeeId: number; 
      employeeUsername: string; 
    }) =>
      apiRequest('POST', `/api/employee/users/${userId}/unsuspend`, { 
        employeeId, 
        employeeUsername 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employee/users'] });
    },
  });

  // Fetch audit logs
  const { data: auditLogs = [] } = useQuery({
    queryKey: ['/api/employee/audit-logs'],
  });

  const handleBanUser = (userId: number, username: string) => {
    const reason = prompt(`Enter reason for banning user "${username}":`);
    if (reason && reason.trim()) {
      banUserMutation.mutate({ userId, reason: reason.trim() });
    }
  };

  const handleFlagUser = (userId: number, username: string) => {
    const reason = prompt(`Enter reason for flagging user "${username}":`);
    if (reason && reason.trim()) {
      flagUserMutation.mutate({ userId, reason: reason.trim() });
    }
  };

  const handleSuspendUser = (userId: number, username: string) => {
    const reason = prompt(`Enter reason for suspending user "${username}":`);
    if (reason && reason.trim()) {
      // For demo purposes, using hardcoded employee info
      // In a real app, this would come from authenticated session
      suspendUserMutation.mutate({ 
        userId, 
        reason: reason.trim(),
        employeeId: 1, // Demo employee ID
        employeeUsername: 'admin' // Demo employee username
      });
    }
  };

  const handleUnsuspendUser = (userId: number) => {
    // For demo purposes, using hardcoded employee info
    unsuspendUserMutation.mutate({ 
      userId,
      employeeId: 1, // Demo employee ID
      employeeUsername: 'admin' // Demo employee username
    });
  };

  // Filter users based on search and status
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id.toString().includes(searchTerm);

    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'banned' && user.isBanned) ||
      (filterStatus === 'flagged' && user.isFlagged) ||
      (filterStatus === 'suspended' && user.isSuspended) ||
      (filterStatus === 'active' && !user.isBanned && !user.isFlagged && !user.isSuspended);

    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => !u.isBanned && !u.isFlagged && !u.isSuspended).length,
    banned: users.filter(u => u.isBanned).length,
    flagged: users.filter(u => u.isFlagged).length,
    suspended: users.filter(u => u.isSuspended).length,
    premium: users.filter(u => u.subscriptionTier === 'premium').length,
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000000',
      color: 'white',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        marginBottom: '32px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <div>
            <h1 style={{
              fontSize: '32px',
              fontWeight: 'bold',
              marginBottom: '8px',
              background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Employee Dashboard
            </h1>
            <p style={{ color: '#9ca3af', fontSize: '16px' }}>
              User management and platform oversight
            </p>
          </div>
          <Link href="/employee/login">
            <button style={{
              padding: '8px 16px',
              backgroundColor: '#374151',
              border: '1px solid #4b5563',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer'
            }}>
              Logout
            </button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '32px'
        }}>
          <div style={{
            backgroundColor: '#111111',
            border: '1px solid #333333',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <Users size={24} color="#60a5fa" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.total}</div>
            <div style={{ color: '#9ca3af', fontSize: '14px' }}>Total Users</div>
          </div>
          <div style={{
            backgroundColor: '#111111',
            border: '1px solid #333333',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <CheckCircle size={24} color="#10b981" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.active}</div>
            <div style={{ color: '#9ca3af', fontSize: '14px' }}>Active Users</div>
          </div>
          <div style={{
            backgroundColor: '#111111',
            border: '1px solid #333333',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <Ban size={24} color="#dc2626" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.banned}</div>
            <div style={{ color: '#9ca3af', fontSize: '14px' }}>Banned Users</div>
          </div>
          <div style={{
            backgroundColor: '#111111',
            border: '1px solid #333333',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <Flag size={24} color="#f59e0b" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.flagged}</div>
            <div style={{ color: '#9ca3af', fontSize: '14px' }}>Flagged Users</div>
          </div>
          <div style={{
            backgroundColor: '#111111',
            border: '1px solid #333333',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <Pause size={24} color="#f97316" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.suspended}</div>
            <div style={{ color: '#9ca3af', fontSize: '14px' }}>Suspended Users</div>
          </div>
          <div style={{
            backgroundColor: '#111111',
            border: '1px solid #333333',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <Shield size={24} color="#8b5cf6" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.premium}</div>
            <div style={{ color: '#9ca3af', fontSize: '14px' }}>Premium Users</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div style={{
          backgroundColor: '#111111',
          border: '1px solid #333333',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '300px' }}>
              <Search size={20} style={{
                position: 'absolute',
                left: '12px',
                top: '12px',
                color: '#9ca3af'
              }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by username, email, or ID..."
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 44px',
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: '12px',
                backgroundColor: '#1a1a1a',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                outline: 'none'
              }}
            >
              <option value="all">All Users</option>
              <option value="active">Active Users</option>
              <option value="banned">Banned Users</option>
              <option value="flagged">Flagged Users</option>
              <option value="suspended">Suspended Users</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div style={{
          backgroundColor: '#111111',
          border: '1px solid #333333',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ color: '#9ca3af' }}>Loading users...</div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ color: '#9ca3af' }}>No users found</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid #333333' }}>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>User</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Subscription</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Status</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Joined</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} style={{ borderBottom: '1px solid #333333' }}>
                      <td style={{ padding: '16px' }}>
                        <div>
                          <div style={{ fontWeight: '600' }}>{user.username}</div>
                          <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                            ID: {user.id} | {user.email || 'No email'}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: user.subscriptionTier === 'premium' ? '#8b5cf6' : 
                                         user.subscriptionTier === 'pro' ? '#3b82f6' : '#6b7280',
                          color: 'white'
                        }}>
                          {user.subscriptionTier.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {user.isBanned && (
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              backgroundColor: '#dc2626',
                              color: 'white'
                            }}>
                              BANNED
                            </span>
                          )}
                          {user.isFlagged && (
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              backgroundColor: '#f59e0b',
                              color: 'white'
                            }}>
                              FLAGGED
                            </span>
                          )}
                          {user.isSuspended && (
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              backgroundColor: '#f97316',
                              color: 'white'
                            }}>
                              SUSPENDED
                            </span>
                          )}
                          {!user.isBanned && !user.isFlagged && !user.isSuspended && (
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              backgroundColor: '#10b981',
                              color: 'white'
                            }}>
                              ACTIVE
                            </span>
                          )}
                        </div>
                        {(user.banReason || user.flagReason || user.suspensionReason) && (
                          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                            {user.banReason || user.flagReason || user.suspensionReason}
                            {user.suspendedBy && (
                              <span> (by {user.suspendedBy})</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#9ca3af' }}>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {!user.isBanned ? (
                            <button
                              onClick={() => handleBanUser(user.id, user.username)}
                              disabled={banUserMutation.isPending}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#dc2626',
                                border: 'none',
                                borderRadius: '4px',
                                color: 'white',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              <Ban size={14} style={{ marginRight: '4px', display: 'inline' }} />
                              Ban
                            </button>
                          ) : (
                            <button
                              onClick={() => unbanUserMutation.mutate(user.id)}
                              disabled={unbanUserMutation.isPending}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#10b981',
                                border: 'none',
                                borderRadius: '4px',
                                color: 'white',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              Unban
                            </button>
                          )}
                          
                          {!user.isFlagged ? (
                            <button
                              onClick={() => handleFlagUser(user.id, user.username)}
                              disabled={flagUserMutation.isPending}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#f59e0b',
                                border: 'none',
                                borderRadius: '4px',
                                color: 'white',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              <Flag size={14} style={{ marginRight: '4px', display: 'inline' }} />
                              Flag
                            </button>
                          ) : (
                            <button
                              onClick={() => unflagUserMutation.mutate(user.id)}
                              disabled={unflagUserMutation.isPending}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#6b7280',
                                border: 'none',
                                borderRadius: '4px',
                                color: 'white',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              Unflag
                            </button>
                          )}

                          {!user.isSuspended ? (
                            <button
                              onClick={() => handleSuspendUser(user.id, user.username)}
                              disabled={suspendUserMutation.isPending}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#f97316',
                                border: 'none',
                                borderRadius: '4px',
                                color: 'white',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              <Pause size={14} style={{ marginRight: '4px', display: 'inline' }} />
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUnsuspendUser(user.id)}
                              disabled={unsuspendUserMutation.isPending}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#059669',
                                border: 'none',
                                borderRadius: '4px',
                                color: 'white',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              <Play size={14} style={{ marginRight: '4px', display: 'inline' }} />
                              Unsuspend
                            </button>
                          )}

                          <button
                            onClick={() => window.open(`/api/employee/users/${user.id}/audit-logs`, '_blank')}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#6b7280',
                              border: 'none',
                              borderRadius: '4px',
                              color: 'white',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            <Clock size={14} style={{ marginRight: '4px', display: 'inline' }} />
                            Audit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}