import { useEffect, useState } from "react";
import API from "./api/axios";
import "./AdminDashboard.css";

function AdminDashboard({ currentUser }) {
    const [dashboard, setDashboard] = useState(null);
    const [users, setUsers] = useState([]);
    const [selectedRole, setSelectedRole] = useState("all");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionLoading, setActionLoading] = useState("");
    const [success, setSuccess] = useState("");

    // Modal state for creating investigator
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newName, setNewName] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState("");
    const [createSuccess, setCreateSuccess] = useState("");

    const fetchAdminData = async (roleFilter = selectedRole) => {
        setLoading(true);
        setError("");

        try {
            const userParams = roleFilter && roleFilter !== "all" ? { role: roleFilter } : {};

            const [statsResponse, usersResponse] = await Promise.all([
                API.get("/admin/stats"),
                API.get("/admin/users", { params: userParams })
            ]);

            setDashboard(statsResponse.data.dashboard);
            setUsers(usersResponse.data.users || []);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to load admin dashboard."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdminData(selectedRole);
    }, []);

    // Filter change handler
    const handleFilterChange = (role) => {
        setSelectedRole(role);
        fetchAdminData(role);
    };

    // Toggle user status (Activate / Deactivate)
    const handleUserStatus = async (user) => {
        const action = user.isActive ? "deactivate" : "activate";

        if (
            !window.confirm(
                `Are you sure you want to ${action} ${user.name}'s account?`
            )
        ) {
            return;
        }

        setActionLoading(user._id);
        setError("");
        setSuccess("");

        try {
            const response = await API.patch(
                `/admin/users/${user._id}/status`,
                { isActive: !user.isActive }
            );

            setSuccess(response.data.message || `User ${action}d successfully.`);
            await fetchAdminData(selectedRole);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                `Unable to ${action} this account.`
            );
        } finally {
            setActionLoading("");
        }
    };

    // Change user role
    const handleRoleChange = async (user, newRole) => {
        if (user.role === newRole) return;

        if (
            !window.confirm(
                `Are you sure you want to change ${user.name}'s role from "${user.role}" to "${newRole}"?`
            )
        ) {
            return;
        }

        setActionLoading(user._id);
        setError("");
        setSuccess("");

        try {
            const response = await API.patch(`/admin/users/${user._id}/role`, {
                role: newRole
            });

            setSuccess(
                response.data.message ||
                `User role updated to ${newRole} successfully.`
            );

            await fetchAdminData(selectedRole);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                `Unable to update role for ${user.name}.`
            );
        } finally {
            setActionLoading("");
        }
    };

    // Create Investigator submission
    const handleCreateInvestigator = async (e) => {
        e.preventDefault();
        setCreateError("");
        setCreateSuccess("");

        if (!newName.trim() || !newEmail.trim() || !newPassword || !confirmPassword) {
            setCreateError("All fields are required.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail.trim())) {
            setCreateError("Please enter a valid email address.");
            return;
        }

        if (newPassword.length < 8) {
            setCreateError("Password must be at least 8 characters.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setCreateError("Passwords do not match.");
            return;
        }

        setCreateLoading(true);

        try {
            const response = await API.post("/admin/users", {
                name: newName.trim(),
                email: newEmail.trim(),
                password: newPassword,
                role: "investigator"
            });

            setCreateSuccess(
                response.data.message || "Investigator account created successfully!"
            );

            // Clear passwords immediately
            setNewPassword("");
            setConfirmPassword("");
            setNewName("");
            setNewEmail("");

            // Refresh dashboard
            await fetchAdminData(selectedRole);

            setTimeout(() => {
                setShowCreateModal(false);
                setCreateSuccess("");
            }, 1200);

        } catch (err) {
            setCreateError(
                err.response?.data?.message ||
                "Failed to create investigator account."
            );
        } finally {
            setCreateLoading(false);
        }
    };

    const closeCreateModal = () => {
        if (createLoading) return;
        setShowCreateModal(false);
        setNewName("");
        setNewEmail("");
        setNewPassword("");
        setConfirmPassword("");
        setCreateError("");
        setCreateSuccess("");
    };

    const formatDate = (date) => {
        if (!date) return "N/A";

        return new Date(date).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    };

    const stats = dashboard?.users;
    const evidenceStats = dashboard?.evidence;

    if (loading && !dashboard) {
        return (
            <div className="panel admin-loading">
                Loading administrator dashboard...
            </div>
        );
    }

    return (
        <div className="admin-dashboard">

            <section className="admin-welcome">
                <div>
                    <span className="admin-eyebrow">SYSTEM MANAGEMENT</span>
                    <h2>Administrator Overview</h2>
                    <p>Monitor users, evidence records and platform activity.</p>
                </div>

                <div className="admin-actions-group">
                    <button
                        className="admin-create-button"
                        onClick={() => {
                            setCreateError("");
                            setCreateSuccess("");
                            setShowCreateModal(true);
                        }}
                    >
                        <span>＋</span> Create Investigator
                    </button>

                    <button
                        className="admin-refresh-button"
                        onClick={() => fetchAdminData(selectedRole)}
                        disabled={loading}
                    >
                        {loading ? "Refreshing..." : "↻ Refresh"}
                    </button>
                </div>
            </section>

            {error && (
                <div className="admin-message admin-error">
                    {error}
                </div>
            )}

            {success && (
                <div className="admin-message admin-success">
                    {success}
                </div>
            )}

            {dashboard && (
                <>
                    <section className="admin-stats-grid">

                        <div className="admin-stat-card">
                            <span>TOTAL USERS</span>
                            <strong>{stats?.total ?? 0}</strong>
                            <small>Registered accounts</small>
                        </div>

                        <div className="admin-stat-card">
                            <span>ACTIVE USERS</span>
                            <strong>{stats?.active ?? 0}</strong>
                            <small>Currently active accounts</small>
                        </div>

                        <div className="admin-stat-card">
                            <span>INACTIVE USERS</span>
                            <strong>{stats?.inactive ?? 0}</strong>
                            <small>Deactivated accounts</small>
                        </div>

                        <div className="admin-stat-card">
                            <span>TOTAL EVIDENCE</span>
                            <strong>{evidenceStats?.total ?? 0}</strong>
                            <small>Platform evidence records</small>
                        </div>

                    </section>

                    <section className="admin-overview-grid">

                        <div className="panel admin-overview-panel">
                            <div className="panel-header">
                                <div>
                                    <h3>User Role Distribution</h3>
                                    <p>Registered accounts by role</p>
                                </div>
                            </div>

                            {["user", "investigator", "admin"].map((role) => {
                                const count = stats?.byRole?.[role] ?? 0;
                                const percentage = stats?.total
                                    ? Math.round((count / stats.total) * 100)
                                    : 0;

                                return (
                                    <div className="admin-role-row" key={role}>
                                        <div className="admin-role-info">
                                            <span>{role}</span>
                                            <strong>{count}</strong>
                                        </div>

                                        <div className="admin-progress-track">
                                            <div
                                                className="admin-progress-fill"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="panel admin-overview-panel">
                            <div className="panel-header">
                                <div>
                                    <h3>Evidence Distribution</h3>
                                    <p>Records grouped by current status</p>
                                </div>
                            </div>

                            {["pending", "verified", "approved", "rejected"].map((status) => (
                                <div className="admin-evidence-row" key={status}>
                                    <span className={`admin-status-dot ${status}`} />
                                    <span>{status}</span>
                                    <strong>
                                        {evidenceStats?.byStatus?.[status] ?? 0}
                                    </strong>
                                </div>
                            ))}
                        </div>

                    </section>
                </>
            )}

            <section className="panel admin-users-panel">

                <div className="panel-header admin-users-header">
                    <div>
                        <h3>User Management</h3>
                        <p>View registered users and manage account access and roles.</p>
                    </div>

                    <div className="admin-users-header-controls">
                        {/* ROLE FILTERS */}
                        <div className="admin-filter-bar">
                            {[
                                { label: "All", value: "all" },
                                { label: "Users", value: "user" },
                                { label: "Investigators", value: "investigator" },
                                { label: "Admins", value: "admin" }
                            ].map((tab) => (
                                <button
                                    key={tab.value}
                                    className={`admin-filter-tab ${selectedRole === tab.value ? "active" : ""}`}
                                    onClick={() => handleFilterChange(tab.value)}
                                    disabled={loading}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <span className="admin-user-count">
                            {users.length} Users
                        </span>
                    </div>
                </div>

                {loading && users.length === 0 ? (
                    <div className="evidence-message">
                        Loading users...
                    </div>
                ) : users.length === 0 ? (
                    <div className="evidence-message">
                        No registered users found for the selected filter.
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="admin-users-table">
                            <thead>
                                <tr>
                                    <th>USER</th>
                                    <th>ROLE</th>
                                    <th>JOINED</th>
                                    <th>ACCOUNT STATUS</th>
                                    <th>ACTION</th>
                                </tr>
                            </thead>

                            <tbody>
                                {users.map((user) => {
                                    const isCurrentUser =
                                        String(user._id) === String(currentUser?._id);

                                    const isBusy = actionLoading === user._id;

                                    return (
                                        <tr key={user._id}>
                                            <td>
                                                <div className="admin-user-cell">
                                                    <div className="admin-user-avatar">
                                                        {user.name?.charAt(0).toUpperCase() || "U"}
                                                    </div>

                                                    <div>
                                                        <strong>{user.name}</strong>
                                                        <span>{user.email}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            <td>
                                                <div className="admin-role-control">
                                                    {isCurrentUser ? (
                                                        <span className={`admin-role-badge ${user.role}`}>
                                                            {user.role} (Current)
                                                        </span>
                                                    ) : (
                                                        <select
                                                            className={`admin-role-select ${user.role}`}
                                                            value={user.role}
                                                            disabled={isBusy}
                                                            onChange={(e) => handleRoleChange(user, e.target.value)}
                                                            title="Change user role"
                                                        >
                                                            <option value="user">User</option>
                                                            <option value="investigator">Investigator</option>
                                                            <option value="admin">Admin</option>
                                                        </select>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="date-cell">
                                                {formatDate(user.createdAt)}
                                            </td>

                                            <td>
                                                <span className={`admin-account-status ${user.isActive ? "active" : "inactive"}`}>
                                                    <span />
                                                    {user.isActive ? "Active" : "Inactive"}
                                                </span>
                                            </td>

                                            <td>
                                                {isCurrentUser ? (
                                                    <span className="admin-self-label">
                                                        Current account
                                                    </span>
                                                ) : (
                                                    <button
                                                        className={`admin-user-action ${user.isActive ? "deactivate" : "activate"}`}
                                                        disabled={isBusy}
                                                        onClick={() => handleUserStatus(user)}
                                                    >
                                                        {isBusy
                                                            ? "Updating..."
                                                            : user.isActive
                                                                ? "Deactivate"
                                                                : "Activate"}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

            </section>

            <div className="admin-security-note">
                <span>⬡</span>
                Account management actions and role assignments are restricted to administrators.
            </div>

            {/* CREATE INVESTIGATOR MODAL */}
            {showCreateModal && (
                <div className="admin-modal-backdrop" onClick={closeCreateModal}>
                    <div
                        className="admin-modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="admin-modal-header">
                            <div>
                                <span className="admin-eyebrow">NEW ACCOUNT</span>
                                <h3>Create Investigator Account</h3>
                            </div>
                            <button
                                className="admin-modal-close"
                                onClick={closeCreateModal}
                                disabled={createLoading}
                                aria-label="Close modal"
                            >
                                ✕
                            </button>
                        </div>

                        {createError && (
                            <div className="admin-message admin-error">
                                {createError}
                            </div>
                        )}

                        {createSuccess && (
                            <div className="admin-message admin-success">
                                {createSuccess}
                            </div>
                        )}

                        <form onSubmit={handleCreateInvestigator} className="admin-modal-form">
                            <div className="admin-form-group">
                                <label htmlFor="inv-name">Full Name</label>
                                <input
                                    id="inv-name"
                                    type="text"
                                    placeholder="e.g. Jane Doe"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    disabled={createLoading}
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="admin-form-group">
                                <label htmlFor="inv-email">Email Address</label>
                                <input
                                    id="inv-email"
                                    type="email"
                                    placeholder="e.g. investigator@proofpath.com"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    disabled={createLoading}
                                    required
                                />
                            </div>

                            <div className="admin-form-row">
                                <div className="admin-form-group">
                                    <label htmlFor="inv-password">Password (min 8 chars)</label>
                                    <input
                                        id="inv-password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        disabled={createLoading}
                                        required
                                        minLength={8}
                                    />
                                </div>

                                <div className="admin-form-group">
                                    <label htmlFor="inv-confirm-password">Confirm Password</label>
                                    <input
                                        id="inv-confirm-password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        disabled={createLoading}
                                        required
                                        minLength={8}
                                    />
                                </div>
                            </div>

                            <div className="admin-modal-actions">
                                <button
                                    type="button"
                                    className="admin-button-cancel"
                                    onClick={closeCreateModal}
                                    disabled={createLoading}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="admin-button-submit"
                                    disabled={createLoading}
                                >
                                    {createLoading ? "Creating Account..." : "Create Investigator"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}

export default AdminDashboard;
