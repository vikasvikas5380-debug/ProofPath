import { useEffect, useState } from "react";
import API from "./api/axios";
import "./AdminDashboard.css";

function AdminDashboard({ currentUser }) {
    const [dashboard, setDashboard] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionLoading, setActionLoading] = useState("");
    const [success, setSuccess] = useState("");

    const fetchAdminData = async () => {
        setLoading(true);
        setError("");

        try {
            const [statsResponse, usersResponse] = await Promise.all([
                API.get("/admin/stats"),
                API.get("/admin/users")
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
        fetchAdminData();
    }, []);

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

            await fetchAdminData();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                `Unable to ${action} this account.`
            );
        } finally {
            setActionLoading("");
        }
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

                <button
                    className="admin-refresh-button"
                    onClick={fetchAdminData}
                    disabled={loading}
                >
                    {loading ? "Refreshing..." : "↻ Refresh"}
                </button>
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

                <div className="panel-header">
                    <div>
                        <h3>User Management</h3>
                        <p>View registered users and manage account access.</p>
                    </div>

                    <span className="admin-user-count">
                        {users.length} Users
                    </span>
                </div>

                {loading && users.length === 0 ? (
                    <div className="evidence-message">
                        Loading users...
                    </div>
                ) : users.length === 0 ? (
                    <div className="evidence-message">
                        No registered users found.
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
                                                <span className={`admin-role-badge ${user.role}`}>
                                                    {user.role}
                                                </span>
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
                Account management actions are restricted to administrators.
            </div>

        </div>
    );
}

export default AdminDashboard;