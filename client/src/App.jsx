
import { useState, useEffect } from "react";
import "./App.css";
import "./Auth.css";
import API from "./api/axios";
import { QRCodeCanvas } from "qrcode.react";
import AdminDashboard from "./AdminDashboard";

function App() {
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem("proofpath_user");
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const [activePage, setActivePage] = useState("Dashboard");
    const [authMode, setAuthMode] = useState("login");

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    // Evidence states
    const [evidence, setEvidence] = useState([]);
    const [uploadTitle, setUploadTitle] = useState("");
    const [uploadDescription, setUploadDescription] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState("");
    const [uploadLoading, setUploadLoading] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const [uploadSuccess, setUploadSuccess] = useState("");

    const [verifyEvidenceId, setVerifyEvidenceId] = useState("");
    const [verifyFile, setVerifyFile] = useState(null);
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [verifyError, setVerifyError] = useState("");
    const [verifyResult, setVerifyResult] = useState(null);
    const [evidenceLoading, setEvidenceLoading] = useState(false);
    const [evidenceError, setEvidenceError] = useState("");

    const [activityHistory, setActivityHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState("");

    const [selectedEvidenceId, setSelectedEvidenceId] = useState("");
    const [selectedEvidence, setSelectedEvidence] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsError, setDetailsError] = useState("");

    // INVESTIGATOR DASHBOARD
    const [investigatorEvidence, setInvestigatorEvidence] = useState([]);
    const [investigatorLoading, setInvestigatorLoading] = useState(false);
    const [investigatorError, setInvestigatorError] = useState("");
    const [investigatorSuccess, setInvestigatorSuccess] = useState("");
    const [investigatorFilter, setInvestigatorFilter] = useState("all");
    const [reviewingEvidenceId, setReviewingEvidenceId] = useState("");

    // PUBLIC QR VERIFICATION
    const [publicVerificationToken, setPublicVerificationToken] = useState(() => {
        const match = window.location.pathname.match(/^\/verify\/([^/]+)\/?$/);
        return match ? decodeURIComponent(match[1]) : "";
    });
    const [publicVerification, setPublicVerification] = useState(null);
    const [publicVerificationLoading, setPublicVerificationLoading] = useState(false);
    const [publicVerificationError, setPublicVerificationError] = useState("");

    // LOGIN
    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setLoading(true);

        try {
            const response = await API.post("/auth/login", {
                email,
                password
            });

            saveSession(response.data);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to connect to the server. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    // REGISTER
    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (password.length < 8) {
            setError("Password must contain at least 8 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            const response = await API.post("/auth/register", {
                name,
                email,
                password
            });

            saveSession(response.data);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Registration failed. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    // SAVE LOGIN SESSION
    const saveSession = (data) => {
        const { token, user: userData } = data;

        localStorage.setItem("proofpath_token", token);
        localStorage.setItem(
            "proofpath_user",
            JSON.stringify(userData)
        );

        setUser(userData);
    };

    // SWITCH LOGIN / REGISTER
    const switchAuthMode = (mode) => {
        setAuthMode(mode);
        setError("");
        setSuccess("");
        setName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
    };

    // LOGOUT
    const handleLogout = () => {
        localStorage.removeItem("proofpath_token");
        localStorage.removeItem("proofpath_user");

        setUser(null);
        setActivePage("Dashboard");
        setEvidence([]);
        switchAuthMode("login");
    };

    // FETCH REAL EVIDENCE FROM BACKEND
    const fetchMyEvidence = async () => {
        setEvidenceLoading(true);
        setEvidenceError("");

        try {
            const response = await API.get("/evidence/my-evidence");
            setEvidence(response.data.evidence || []);
        } catch (err) {
            setEvidenceError(
                err.response?.data?.message ||
                "Unable to retrieve your evidence."
            );
        } finally {
            setEvidenceLoading(false);
        }
    };

    // FETCH ONE EVIDENCE RECORD FOR THE DETAILS PAGE
    const fetchEvidenceDetails = async (evidenceId) => {
        if (!evidenceId) return;

        setDetailsLoading(true);
        setDetailsError("");
        setSelectedEvidence(null);

        try {
            const response = await API.get(`/evidence/${evidenceId}`);
            setSelectedEvidence(response.data.evidence || response.data);
        } catch (err) {
            setDetailsError(
                err.response?.data?.message ||
                "Unable to retrieve evidence details. Please try again."
            );
        } finally {
            setDetailsLoading(false);
        }
    };

    const openEvidenceDetails = (evidenceId) => {
        setSelectedEvidenceId(evidenceId);
        setActivePage("Evidence Details");
    };

    // FETCH ACTIVITY HISTORY FOR ALL OF THE USER'S EVIDENCE
    const fetchActivityHistory = async () => {
        setHistoryLoading(true);
        setHistoryError("");

        try {
            const evidenceResponse = await API.get("/evidence/my-evidence");
            const userEvidence = evidenceResponse.data.evidence || [];
            setEvidence(userEvidence);

            const historyResponses = await Promise.all(
                userEvidence.map(async (item) => {
                    const response = await API.get(`/evidence/${item._id}/history`);
                    const entries = response.data.history ||
                        response.data.evidence?.history || [];

                    return entries.map((entry, index) => ({
                        ...entry,
                        evidenceTitle: item.title,
                        evidenceFileName: item.fileName,
                        evidenceId: item._id,
                        activityId: entry._id ||
                            `${item._id}-${entry.timestamp || index}-${index}`
                    }));
                })
            );

            setActivityHistory(
                historyResponses.flat().sort((a, b) =>
                    new Date(b.timestamp || b.createdAt || 0) -
                    new Date(a.timestamp || a.createdAt || 0)
                )
            );
        } catch (err) {
            setHistoryError(
                err.response?.data?.message ||
                "Unable to retrieve activity history. Please try again."
            );
        } finally {
            setHistoryLoading(false);
        }
    };

    // HANDLE FILE SELECTION
    const handleFileSelection = (e) => {
        const file = e.target.files?.[0];

        setUploadError("");
        setUploadSuccess("");
        setFilePreview("");

        if (!file) {
            setSelectedFile(null);
            return;
        }

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "video/mp4",
            "application/pdf",
            "text/plain"
        ];

        if (!allowedTypes.includes(file.type)) {
            setSelectedFile(null);
            e.target.value = "";
            setUploadError(
                "Unsupported file type. Select JPG, PNG, WEBP, MP4, PDF or TXT."
            );
            return;
        }

        if (file.size > 50 * 1024 * 1024) {
            setSelectedFile(null);
            e.target.value = "";
            setUploadError("File size must not exceed 50 MB.");
            return;
        }

        setSelectedFile(file);

        if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
            setFilePreview(URL.createObjectURL(file));
        }
    };

    // RELEASE LOCAL FILE PREVIEW URL
    useEffect(() => {
        return () => {
            if (filePreview) URL.revokeObjectURL(filePreview);
        };
    }, [filePreview]);

    // UPLOAD EVIDENCE TO BACKEND
    const handleEvidenceUpload = async (e) => {
        e.preventDefault();

        setUploadError("");
        setUploadSuccess("");

        if (!uploadTitle.trim()) {
            setUploadError("Please enter an evidence title.");
            return;
        }

        if (!selectedFile) {
            setUploadError("Please select an evidence file.");
            return;
        }

        const formData = new FormData();
        formData.append("title", uploadTitle.trim());
        formData.append("description", uploadDescription.trim());
        formData.append("evidence", selectedFile);

        setUploadLoading(true);

        try {
            const response = await API.post("/evidence", formData);

            setUploadSuccess(
                response.data?.message || "Evidence uploaded successfully."
            );

            setUploadTitle("");
            setUploadDescription("");
            setSelectedFile(null);
            setFilePreview("");

            const fileInput = document.getElementById("evidence-file");
            if (fileInput) fileInput.value = "";

            await fetchMyEvidence();
        } catch (err) {
            setUploadError(
                err.response?.data?.message ||
                "Evidence upload failed. Please try again."
            );
        } finally {
            setUploadLoading(false);
        }
    };

    // HANDLE VERIFICATION FILE SELECTION
    const handleVerifyFileSelection = (e) => {
        const file = e.target.files?.[0];

        setVerifyError("");
        setVerifyResult(null);

        if (!file) {
            setVerifyFile(null);
            return;
        }

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "video/mp4",
            "application/pdf",
            "text/plain"
        ];

        if (!allowedTypes.includes(file.type)) {
            setVerifyFile(null);
            e.target.value = "";
            setVerifyError(
                "Unsupported file type. Select JPG, PNG, WEBP, MP4, PDF or TXT."
            );
            return;
        }

        if (file.size > 50 * 1024 * 1024) {
            setVerifyFile(null);
            e.target.value = "";
            setVerifyError("File size must not exceed 50 MB.");
            return;
        }

        setVerifyFile(file);
    };

    // VERIFY A REGISTERED EVIDENCE FILE
    const handleEvidenceVerification = async (e) => {
        e.preventDefault();

        setVerifyError("");
        setVerifyResult(null);

        if (!verifyEvidenceId) {
            setVerifyError("Please select registered evidence.");
            return;
        }

        if (!verifyFile) {
            setVerifyError("Please select the file you want to verify.");
            return;
        }

        const formData = new FormData();
        formData.append("evidence", verifyFile);

        setVerifyLoading(true);

        try {
            const response = await API.post(
                `/evidence/${verifyEvidenceId}/verify`,
                formData
            );

            setVerifyResult(response.data);
            await fetchMyEvidence();

            setVerifyFile(null);
            const fileInput = document.getElementById("verify-evidence-file");
            if (fileInput) fileInput.value = "";
        } catch (err) {
            setVerifyError(
                err.response?.data?.message ||
                "Evidence verification failed. Please try again."
            );
        } finally {
            setVerifyLoading(false);
        }
    };

    // FETCH ALL EVIDENCE FOR INVESTIGATORS AND ADMINS
    const fetchInvestigatorEvidence = async () => {
        setInvestigatorLoading(true);
        setInvestigatorError("");

        try {
            const response = await API.get("/evidence/all");
            setInvestigatorEvidence(response.data.evidence || []);
        } catch (err) {
            setInvestigatorError(
                err.response?.data?.message ||
                "Unable to retrieve submitted evidence. Please try again."
            );
        } finally {
            setInvestigatorLoading(false);
        }
    };

    // REVIEW EVIDENCE AND RECORD THE DECISION IN THE CHAIN OF CUSTODY
    const handleEvidenceReview = async (item, decision) => {
        const actionLabel = decision === "approved" ? "approve" : "reject";
        const remarks = window.prompt(
            `Optional remarks for this ${actionLabel} decision:`,
            ""
        );

        if (remarks === null) return;

        setReviewingEvidenceId(item._id);
        setInvestigatorError("");
        setInvestigatorSuccess("");

        try {
            const response = await API.patch(`/evidence/${item._id}/review`, {
                decision,
                remarks
            });

            setInvestigatorSuccess(
                response.data.message ||
                `Evidence ${decision} successfully.`
            );

            await fetchInvestigatorEvidence();
        } catch (err) {
            setInvestigatorError(
                err.response?.data?.message ||
                `Unable to ${actionLabel} this evidence. Please try again.`
            );
        } finally {
            setReviewingEvidenceId("");
        }
    };

    // FETCH WHEN DASHBOARD OR MY EVIDENCE IS OPENED
    useEffect(() => {
        if (
            user &&
            (
                activePage === "Dashboard" ||
                activePage === "My Evidence" ||
                activePage === "Verify Evidence"
            )
        ) {
            fetchMyEvidence();
        }

        if (user && activePage === "Activity History") {
            fetchActivityHistory();
        }

        if (
            user &&
            ["investigator", "admin"].includes(user.role) &&
            activePage === "Investigator Dashboard"
        ) {
            fetchInvestigatorEvidence();
        }

        if (user && activePage === "Evidence Details" && selectedEvidenceId) {
            fetchEvidenceDetails(selectedEvidenceId);
        }
    }, [user, activePage, selectedEvidenceId]);

    // FETCH PUBLIC VERIFICATION DETAILS FROM THE QR TOKEN
    useEffect(() => {
        if (!publicVerificationToken) return;

        const fetchPublicVerification = async () => {
            setPublicVerificationLoading(true);
            setPublicVerificationError("");
            setPublicVerification(null);

            try {
                const response = await API.get(
                    `/evidence/public/verify/${encodeURIComponent(publicVerificationToken)}`
                );

                setPublicVerification(response.data.verification || null);
            } catch (err) {
                setPublicVerificationError(
                    err.response?.data?.message ||
                    "Unable to verify this QR code. Please try again."
                );
            } finally {
                setPublicVerificationLoading(false);
            }
        };

        fetchPublicVerification();
    }, [publicVerificationToken]);

    // PUBLIC QR VERIFICATION PAGE (NO LOGIN REQUIRED)
    if (publicVerificationToken) {
        const verification = publicVerification;
        const status = verification?.status?.toLowerCase();

        const statusLabel = status
            ? status.replace(/\b\w/g, (character) => character.toUpperCase())
            : "Unknown";

        return (
            <div className="public-verification-page">
                <div className="public-verification-card">

                    <div className="public-verification-brand">
                        <div className="brand-icon">P</div>
                        <div>
                            <h2>ProofPath</h2>
                            <span>Evidence Intelligence</span>
                        </div>
                    </div>

                    {publicVerificationLoading ? (
                        <div className="public-verification-state">
                            <div className="public-spinner"></div>
                            <h1>Checking Evidence Record</h1>
                            <p>
                                Connecting securely to the ProofPath verification service...
                            </p>
                        </div>
                    ) : publicVerificationError ? (
                        <div className="public-verification-state">
                            <div className="public-result-icon public-result-error">!</div>
                            <span className="public-eyebrow">QR VERIFICATION</span>
                            <h1>Record Not Found</h1>
                            <p>{publicVerificationError}</p>
                            <span className="public-status-badge error">
                                UNABLE TO VERIFY RECORD
                            </span>
                        </div>
                    ) : verification ? (
                        <>
                            <div className="public-verification-state">
                                <div className="public-result-icon public-result-success">✓</div>
                                <span className="public-eyebrow">QR VERIFICATION RESULT</span>
                                <h1>Registered Record Found</h1>
                                <p>
                                    This QR code matches an evidence record registered in ProofPath.
                                </p>
                                <span className="public-status-badge success">
                                    RECORD EXISTS
                                </span>
                            </div>

                            <div className="public-evidence-details">
                                <div className="public-detail-row">
                                    <span>EVIDENCE TITLE</span>
                                    <strong>{verification.title}</strong>
                                </div>

                                <div className="public-detail-row">
                                    <span>FILE NAME</span>
                                    <strong>{verification.fileName}</strong>
                                </div>

                                <div className="public-detail-row">
                                    <span>FILE TYPE</span>
                                    <strong>{verification.fileType}</strong>
                                </div>

                                <div className="public-detail-row">
                                    <span>REGISTRATION STATUS</span>
                                    <strong className={`public-record-status ${status || ""}`}>
                                        {statusLabel}
                                    </strong>
                                </div>

                                <div className="public-detail-row">
                                    <span>REGISTERED ON</span>
                                    <strong>
                                        {verification.registeredAt
                                            ? new Date(verification.registeredAt).toLocaleString("en-IN")
                                            : "N/A"}
                                    </strong>
                                </div>

                                <div className="public-hash-block">
                                    <span>REGISTERED SHA-256 FINGERPRINT</span>
                                    <code>{verification.fileHash}</code>
                                </div>
                            </div>

                            <div className="public-verification-note">
                                <strong>What this result means</strong>
                                <p>
                                    The QR code identifies a record in ProofPath. This scan alone
                                    does not prove that a file currently in someone's possession
                                    matches the registered file. File integrity must be confirmed
                                    by comparing its SHA-256 fingerprint.
                                </p>
                            </div>
                        </>
                    ) : null}

                    <div className="public-verification-footer">
                        © 2026 ProofPath · Secure Digital Evidence Verification
                    </div>
                </div>
            </div>
        );
    }

    // AUTHENTICATION SCREEN
    if (!user) {
        return (
            <div className="auth-page">

                <div className="auth-brand">
                    <div className="brand-icon">P</div>
                    <div>
                        <h2>ProofPath</h2>
                        <span>Evidence Intelligence</span>
                    </div>
                </div>

                <div className="auth-card">
                    <div className="auth-symbol">⬡</div>

                    <div className="auth-heading">
                        <span>
                            {authMode === "login"
                                ? "SECURE ACCESS"
                                : "JOIN PROOFPATH"}
                        </span>

                        <h1>
                            {authMode === "login"
                                ? "Welcome back"
                                : "Create account"}
                        </h1>

                        <p>
                            {authMode === "login"
                                ? "Sign in to access your digital evidence workspace."
                                : "Create your account to start managing digital evidence securely."}
                        </p>
                    </div>

                    <form
                        onSubmit={
                            authMode === "login"
                                ? handleLogin
                                : handleRegister
                        }
                    >
                        {authMode === "register" && (
                            <>
                                <label htmlFor="name">Full Name</label>
                                <input
                                    id="name"
                                    type="text"
                                    placeholder="Enter your full name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </>
                        )}

                        <label htmlFor="email">Email Address</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            minLength={8}
                            required
                        />

                        {authMode === "register" && (
                            <>
                                <label htmlFor="confirmPassword">
                                    Confirm Password
                                </label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="Confirm your password"
                                    value={confirmPassword}
                                    onChange={(e) =>
                                        setConfirmPassword(e.target.value)
                                    }
                                    minLength={8}
                                    required
                                />
                            </>
                        )}

                        {error && (
                            <div className="auth-error">{error}</div>
                        )}

                        {success && (
                            <div className="auth-success">{success}</div>
                        )}

                        <button
                            type="submit"
                            className="auth-submit"
                            disabled={loading}
                        >
                            {loading
                                ? "Please wait..."
                                : authMode === "login"
                                    ? "Sign In"
                                    : "Create Account"}

                            {!loading && <span>→</span>}
                        </button>
                    </form>

                    <div className="auth-switch">
                        {authMode === "login"
                            ? "Don't have an account?"
                            : "Already have an account?"}

                        <button
                            type="button"
                            onClick={() =>
                                switchAuthMode(
                                    authMode === "login"
                                        ? "register"
                                        : "login"
                                )
                            }
                        >
                            {authMode === "login"
                                ? "Create Account"
                                : "Sign In"}
                        </button>
                    </div>

                    <div className="auth-security">
                        <span>✓</span>
                        Protected with secure JWT authentication
                    </div>
                </div>

                <div className="auth-footer">
                    © 2026 ProofPath · Secure Digital Evidence Management
                </div>
            </div>
        );
    }

    // NAVIGATION
    const navigation = [
        { name: "Dashboard", icon: "▦" },
        { name: "My Evidence", icon: "▤" },
        { name: "Upload Evidence", icon: "＋" },
        { name: "Verify Evidence", icon: "◈" },
        { name: "Activity History", icon: "◷" },
        ...(["investigator", "admin"].includes(user?.role)
            ? [{ name: "Investigator Dashboard", icon: "⚖" }]
            : []),
        ...(user?.role === "admin"
            ? [{ name: "Admin Dashboard", icon: "⚙" }]
            : [])
    ];

    // STATUS COLOR
    const getStatusColor = (status) => {
        const colors = {
            verified: "green",
            approved: "blue",
            pending: "yellow",
            rejected: "red"
        };

        return colors[status?.toLowerCase()] || "blue";
    };

    // FILE TYPE
    const getFileType = (mimeType) => {
        if (!mimeType) return "FILE";

        if (mimeType.startsWith("image/")) return "IMAGE";
        if (mimeType.startsWith("video/")) return "VIDEO";
        if (mimeType === "application/pdf") return "PDF";

        return "DOCUMENT";
    };

    // FORMAT DATE
    const formatDate = (date) => {
        if (!date) return "N/A";

        return new Date(date).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    };

    // DYNAMIC EVIDENCE STATISTICS
    const verifiedCount = evidence.filter(
        item => item.status === "verified"
    ).length;

    const pendingCount = evidence.filter(
        item => item.status === "pending"
    ).length;

    const rejectedCount = evidence.filter(
        item => item.status === "rejected"
    ).length;

    const approvedCount = evidence.filter(
        item => item.status === "approved"
    ).length;

    const totalCount = evidence.length;

    // Percentage of evidence with verified status
    const integrityPercentage = totalCount > 0
        ? Math.round((verifiedCount / totalCount) * 100)
        : 0;

    // DASHBOARD STATISTICS
    const stats = [
        {
            title: "Total Evidence",
            value: totalCount,
            change: "Total submitted files",
            icon: "▤",
            color: "blue"
        },
        {
            title: "Verified",
            value: verifiedCount,
            change: "Integrity confirmed",
            icon: "✓",
            color: "green"
        },
        {
            title: "Pending Review",
            value: pendingCount,
            change: "Awaiting investigation",
            icon: "◷",
            color: "yellow"
        },
        {
            title: "Rejected",
            value: rejectedCount,
            change: "Requires attention",
            icon: "×",
            color: "red"
        }
    ];

    // MY EVIDENCE PAGE
    const renderMyEvidence = () => (
        <div className="panel evidence-panel">

            <div className="panel-header">
                <div>
                    <h3>My Evidence</h3>
                    <p>All evidence submitted by your account</p>
                </div>

                <button
                    className="text-button"
                    onClick={fetchMyEvidence}
                    disabled={evidenceLoading}
                >
                    {evidenceLoading ? "Refreshing..." : "↻ Refresh"}
                </button>
            </div>

            {evidenceLoading ? (
                <div className="evidence-message">
                    Loading your evidence...
                </div>
            ) : evidenceError ? (
                <div className="evidence-message evidence-error">
                    {evidenceError}
                    <button
                        className="text-button"
                        onClick={fetchMyEvidence}
                    >
                        Try Again
                    </button>
                </div>
            ) : evidence.length === 0 ? (
                <div className="evidence-message">
                    <div className="empty-icon">▤</div>
                    <h3>No Evidence Found</h3>
                    <p>You haven't submitted any evidence yet.</p>
                    <button
                        className="primary-button"
                        onClick={() => setActivePage("Upload Evidence")}
                    >
                        ＋ Upload Evidence
                    </button>
                </div>
            ) : (
                <>
                    <div className="evidence-count">
                        Total records: <strong>{evidence.length}</strong>
                    </div>

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>EVIDENCE</th>
                                    <th>FILE TYPE</th>
                                    <th>SUBMITTED</th>
                                    <th>STATUS</th>
                                    <th>ACTION</th>
                                </tr>
                            </thead>

                            <tbody>
                                {evidence.map((item) => (
                                    <tr key={item._id}>
                                        <td>
                                            <div className="evidence-name">
                                                <div className="file-icon">
                                                    {getFileType(item.fileType) === "IMAGE"
                                                        ? "▧"
                                                        : getFileType(item.fileType) === "VIDEO"
                                                            ? "▷"
                                                            : "▤"}
                                                </div>

                                                <div>
                                                    <strong>{item.title}</strong>
                                                    <span>{item.fileName}</span>
                                                </div>
                                            </div>
                                        </td>

                                        <td>
                                            <span className="file-type">
                                                {getFileType(item.fileType)}
                                            </span>
                                        </td>

                                        <td className="date-cell">
                                            {formatDate(item.createdAt)}
                                        </td>

                                        <td>
                                            <span className={`status ${getStatusColor(item.status)}`}>
                                                <span></span>
                                                {item.status}
                                            </span>
                                        </td>

                                        <td>
                                            <button
                                                className="details-button"
                                                onClick={() => openEvidenceDetails(item._id)}
                                            >
                                                View Details →
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );

    // UPLOAD EVIDENCE PAGE
    const renderUploadEvidence = () => (
        <div className="panel upload-panel">
            <div className="panel-header">
                <div>
                    <h3>Register New Evidence</h3>
                    <p>
                        Upload a file to generate its SHA-256 fingerprint and register it securely.
                    </p>
                </div>
            </div>

            <form className="upload-form" onSubmit={handleEvidenceUpload}>
                <div className="upload-field">
                    <label htmlFor="evidence-title">Evidence Title</label>
                    <input
                        id="evidence-title"
                        type="text"
                        placeholder="e.g. Incident Photograph"
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                        maxLength={120}
                        required
                    />
                </div>

                <div className="upload-field">
                    <label htmlFor="evidence-description">Description</label>
                    <textarea
                        id="evidence-description"
                        placeholder="Provide details about this evidence..."
                        value={uploadDescription}
                        onChange={(e) => setUploadDescription(e.target.value)}
                        rows={4}
                    />
                </div>

                <div className="upload-field">
                    <label htmlFor="evidence-file">Evidence File</label>
                    <input
                        id="evidence-file"
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.mp4,.pdf,.txt,image/jpeg,image/png,image/webp,video/mp4,application/pdf,text/plain"
                        onChange={handleFileSelection}
                    />
                    <small>
                        Accepted: JPG, PNG, WEBP, MP4, PDF and TXT. Maximum size: 50 MB.
                    </small>
                </div>

                {selectedFile && (
                    <div className="selected-file-card">
                        {filePreview && selectedFile.type.startsWith("image/") && (
                            <img
                                src={filePreview}
                                alt="Selected evidence preview"
                                className="upload-preview"
                            />
                        )}

                        {filePreview && selectedFile.type.startsWith("video/") && (
                            <video
                                src={filePreview}
                                controls
                                className="upload-preview"
                            />
                        )}

                        <div className="selected-file-info">
                            <strong>{selectedFile.name}</strong>
                            <span>
                                {getFileType(selectedFile.type)} ·
                                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                            </span>
                        </div>

                        <button
                            type="button"
                            className="text-button"
                            onClick={() => {
                                setSelectedFile(null);
                                setFilePreview("");
                                const input = document.getElementById("evidence-file");
                                if (input) input.value = "";
                            }}
                        >
                            Remove
                        </button>
                    </div>
                )}

                {uploadError && (
                    <div className="upload-message upload-error">
                        {uploadError}
                    </div>
                )}

                {uploadSuccess && (
                    <div className="upload-message upload-success">
                        {uploadSuccess}
                    </div>
                )}

                <div className="upload-actions">
                    <button
                        type="button"
                        className="text-button"
                        onClick={() => {
                            setUploadTitle("");
                            setUploadDescription("");
                            setSelectedFile(null);
                            setFilePreview("");
                            setUploadError("");
                            setUploadSuccess("");

                            const input = document.getElementById("evidence-file");
                            if (input) input.value = "";
                        }}
                        disabled={uploadLoading}
                    >
                        Clear Form
                    </button>

                    <button
                        type="submit"
                        className="primary-button"
                        disabled={uploadLoading}
                    >
                        {uploadLoading ? "Uploading..." : "＋ Register Evidence"}
                    </button>
                </div>
            </form>
        </div>
    );

    // VERIFY EVIDENCE PAGE
    const renderVerifyEvidence = () => {
        const verified = verifyResult?.verification?.isAuthentic === true;

        return (
            <div className="panel verify-panel">
                <div className="panel-header">
                    <div>
                        <h3>Verify Evidence Integrity</h3>
                        <p>
                            Select a registered record and upload its file for SHA-256 comparison.
                        </p>
                    </div>

                    <button
                        className="text-button"
                        onClick={fetchMyEvidence}
                        disabled={evidenceLoading}
                    >
                        {evidenceLoading ? "Refreshing..." : "↻ Refresh"}
                    </button>
                </div>

                {evidenceLoading ? (
                    <div className="evidence-message">
                        Loading your registered evidence...
                    </div>
                ) : evidenceError ? (
                    <div className="evidence-message evidence-error">
                        {evidenceError}
                    </div>
                ) : evidence.length === 0 ? (
                    <div className="evidence-message">
                        <div className="empty-icon">◈</div>
                        <h3>No Registered Evidence</h3>
                        <p>Upload evidence before attempting verification.</p>
                        <button
                            className="primary-button"
                            onClick={() => setActivePage("Upload Evidence")}
                        >
                            ＋ Upload Evidence
                        </button>
                    </div>
                ) : (
                    <form
                        className="verify-form"
                        onSubmit={handleEvidenceVerification}
                    >
                        <div className="upload-field">
                            <label htmlFor="verify-evidence-select">
                                Registered Evidence
                            </label>

                            <select
                                id="verify-evidence-select"
                                value={verifyEvidenceId}
                                onChange={(e) => {
                                    setVerifyEvidenceId(e.target.value);
                                    setVerifyResult(null);
                                    setVerifyError("");
                                }}
                                required
                            >
                                <option value="">Select evidence to verify</option>

                                {evidence.map((item) => (
                                    <option key={item._id} value={item._id}>
                                        {item.title} — {item.fileName}
                                    </option>
                                ))}
                            </select>

                            <small>
                                Choose the evidence record that matches the file you are uploading.
                            </small>
                        </div>

                        <div className="upload-field">
                            <label htmlFor="verify-evidence-file">
                                File to Verify
                            </label>

                            <input
                                id="verify-evidence-file"
                                type="file"
                                accept=".jpg,.jpeg,.png,.webp,.mp4,.pdf,.txt,image/jpeg,image/png,image/webp,video/mp4,application/pdf,text/plain"
                                onChange={handleVerifyFileSelection}
                                required
                            />

                            <small>
                                Upload the original file or a file you suspect has been modified.
                                Maximum size: 50 MB.
                            </small>
                        </div>

                        {verifyFile && (
                            <div className="selected-file-card">
                                <div className="selected-file-info">
                                    <strong>{verifyFile.name}</strong>
                                    <span>
                                        {getFileType(verifyFile.type)} ·
                                        {(verifyFile.size / (1024 * 1024)).toFixed(2)} MB
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    className="text-button"
                                    onClick={() => {
                                        setVerifyFile(null);
                                        const input = document.getElementById("verify-evidence-file");
                                        if (input) input.value = "";
                                    }}
                                >
                                    Remove
                                </button>
                            </div>
                        )}

                        {verifyError && (
                            <div className="upload-message upload-error">
                                {verifyError}
                            </div>
                        )}

                        {verifyResult && (
                            <div className={`verification-result ${verified ? "verification-match" : "verification-mismatch"}`}>
                                <div className="verification-result-icon">
                                    {verified ? "✓" : "!"}
                                </div>

                                <div>
                                    <h3>
                                        {verified ? "Integrity Match" : "Integrity Mismatch"}
                                    </h3>

                                    <p>
                                        {verifyResult.message ||
                                            (verified
                                                ? "The uploaded file matches the registered SHA-256 fingerprint."
                                                : "The uploaded file does not match the registered SHA-256 fingerprint.")}
                                    </p>

                                    {verifyResult.verification?.status && (
                                        <span>
                                            Current status: {verifyResult.verification.status}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="upload-actions">
                            <button
                                type="button"
                                className="text-button"
                                onClick={() => {
                                    setVerifyEvidenceId("");
                                    setVerifyFile(null);
                                    setVerifyError("");
                                    setVerifyResult(null);

                                    const input = document.getElementById("verify-evidence-file");
                                    if (input) input.value = "";
                                }}
                                disabled={verifyLoading}
                            >
                                Clear Form
                            </button>

                            <button
                                type="submit"
                                className="primary-button"
                                disabled={verifyLoading || evidenceLoading}
                            >
                                {verifyLoading ? "Verifying..." : "◈ Verify Integrity"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        );
    };

    // HUMAN-READABLE ACTIVITY LABELS
    const getActivityLabel = (action) => {
        const labels = {
            EVIDENCE_UPLOADED: "Evidence uploaded",
            EVIDENCE_VERIFIED: "Evidence successfully verified",
            VERIFICATION_FAILED: "Evidence integrity check failed",
            EVIDENCE_APPROVED: "Evidence approved",
            EVIDENCE_REJECTED: "Evidence rejected"
        };

        return labels[action] ||
            (action || "Evidence activity").replaceAll("_", " ");
    };

    const getActivityTone = (action) => {
        const value = (action || "").toUpperCase();

        if (value.includes("FAILED") || value.includes("REJECT")) return "red";
        if (value.includes("VERIFIED") || value.includes("APPROVED")) return "green";
        if (value.includes("UPLOADED")) return "blue";

        return "yellow";
    };

    const formatActivityDate = (date) => {
        if (!date) return "Date unavailable";

        return new Date(date).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    // DOWNLOAD THE SELECTED EVIDENCE QR CODE
    const downloadEvidenceQR = () => {
        const canvas = document.querySelector("#evidence-qr-code canvas");

        if (!canvas || !selectedEvidence?._id) return;

        const downloadLink = document.createElement("a");
        downloadLink.href = canvas.toDataURL("image/png");
        downloadLink.download = `ProofPath-QR-${selectedEvidence._id}.png`;

        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    };

    // EVIDENCE DETAILS PAGE
    const renderEvidenceDetails = () => {
        const item = selectedEvidence;
        const fileType = getFileType(item?.fileType);

        return (
            <div className="evidence-details-page">
                <button
                    className="text-button details-back-button"
                    onClick={() => setActivePage("My Evidence")}
                >
                    ← Back to My Evidence
                </button>

                {detailsLoading ? (
                    <div className="panel evidence-message">
                        Loading evidence details...
                    </div>
                ) : detailsError ? (
                    <div className="panel evidence-message evidence-error">
                        {detailsError}

                        <button
                            className="text-button"
                            onClick={() => fetchEvidenceDetails(selectedEvidenceId)}
                        >
                            Try Again
                        </button>
                    </div>
                ) : item ? (
                    <>
                        <section className="panel details-main-panel">
                            <div className="details-heading">
                                <div>
                                    <span className="details-eyebrow">
                                        REGISTERED EVIDENCE
                                    </span>
                                    <h2>{item.title || "Untitled Evidence"}</h2>
                                    <p>
                                        {item.description || "No description provided."}
                                    </p>
                                </div>

                                <span className={`status ${getStatusColor(item.status)}`}>
                                    <span></span>
                                    {item.status || "Unknown"}
                                </span>
                            </div>

                            <div className="details-preview">
                                {fileType === "IMAGE" && item.fileUrl ? (
                                    <img
                                        src={item.fileUrl}
                                        alt={item.title || "Evidence file"}
                                    />
                                ) : fileType === "VIDEO" && item.fileUrl ? (
                                    <video src={item.fileUrl} controls />
                                ) : (
                                    <div className="details-file-placeholder">
                                        <span>
                                            {fileType === "PDF" ? "▧" : "▤"}
                                        </span>
                                        <strong>
                                            {item.fileName || "Evidence file"}
                                        </strong>

                                        {item.fileUrl && (
                                            <a
                                                href={item.fileUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                Open uploaded file ↗
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="panel details-information-panel">
                            <div className="panel-header">
                                <div>
                                    <h3>Evidence Information</h3>
                                    <p>
                                        Original registration details and integrity fingerprint.
                                    </p>
                                </div>
                            </div>

                            <div className="details-grid">
                                <div className="details-field">
                                    <span>FILE NAME</span>
                                    <strong>{item.fileName || "N/A"}</strong>
                                </div>

                                <div className="details-field">
                                    <span>FILE TYPE</span>
                                    <strong>{item.fileType || "N/A"}</strong>
                                </div>

                                <div className="details-field">
                                    <span>SUBMITTED ON</span>
                                    <strong>
                                        {item.createdAt
                                            ? new Date(item.createdAt).toLocaleString("en-IN")
                                            : "N/A"}
                                    </strong>
                                </div>

                                <div className="details-field">
                                    <span>LAST UPDATED</span>
                                    <strong>
                                        {item.updatedAt
                                            ? new Date(item.updatedAt).toLocaleString("en-IN")
                                            : "N/A"}
                                    </strong>
                                </div>

                                <div className="details-field">
                                    <span>SUBMITTED BY</span>
                                    <strong>
                                        {item.submittedBy?.name || user.name || "N/A"}
                                    </strong>
                                </div>

                                <div className="details-field">
                                    <span>EVIDENCE RECORD ID</span>
                                    <strong className="details-id">
                                        {item._id || selectedEvidenceId}
                                    </strong>
                                </div>
                            </div>

                            <div className="details-hash-block">
                                <div>
                                    <span>SHA-256 INTEGRITY HASH</span>
                                    <p>
                                        Fingerprint generated when this evidence was registered.
                                    </p>
                                </div>

                                <code>
                                    {item.fileHash || "Hash not available for this record."}
                                </code>

                                {item.fileHash && (
                                    <button
                                        className="text-button"
                                        onClick={() =>
                                            navigator.clipboard?.writeText(item.fileHash)
                                        }
                                    >
                                        Copy Hash
                                    </button>
                                )}
                            </div>
                        </section>

                        <section className="panel evidence-qr-panel">
                            <div className="panel-header">
                                <div>
                                    <h3>Evidence QR Code</h3>
                                    <p>
                                        Scan this code to open the evidence verification page.
                                    </p>
                                </div>

                                <span className="qr-status">
                                    UNIQUE RECORD CODE
                                </span>
                            </div>

                            {item.verificationToken ? (
                                <div className="evidence-qr-content">
                                    <div
                                        className="evidence-qr-code"
                                        id="evidence-qr-code"
                                    >
                                        <QRCodeCanvas
                                            value={`${window.location.origin}/verify/${item.verificationToken}`}
                                            size={220}
                                            level="H"
                                            includeMargin
                                            bgColor="#ffffff"
                                            fgColor="#0b1523"
                                        />
                                    </div>

                                    <div className="evidence-qr-info">
                                        <h4>Scan to verify this evidence</h4>
                                        <p>
                                            Scan this QR code to open the public ProofPath page
                                            and view the registered evidence record.
                                        </p>

                                        <div className="qr-record-id">
                                            <span>PUBLIC VERIFICATION TOKEN</span>
                                            <code>{item.verificationToken}</code>
                                        </div>

                                        <button
                                            className="primary-button qr-download-button"
                                            onClick={downloadEvidenceQR}
                                        >
                                            ↓ Download QR Code
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="evidence-message">
                                    A verification token is not available for this record.
                                    New evidence records receive a token automatically.
                                    Refresh the evidence details or register a new record.
                                </div>
                            )}
                        </section>
                    </>
                ) : (
                    <div className="panel evidence-message">
                        Evidence record not found.
                    </div>
                )}
            </div>
        );
    };

    // INVESTIGATOR DASHBOARD PAGE
    const renderInvestigatorDashboard = () => {
        const pendingCount = investigatorEvidence.filter(
            (item) => item.status === "pending"
        ).length;

        const verifiedCount = investigatorEvidence.filter(
            (item) => item.status === "verified"
        ).length;

        const approvedCount = investigatorEvidence.filter(
            (item) => item.status === "approved"
        ).length;

        const rejectedCount = investigatorEvidence.filter(
            (item) => item.status === "rejected"
        ).length;

        const filteredEvidence = investigatorEvidence.filter((item) =>
            investigatorFilter === "all"
                ? true
                : item.status === investigatorFilter
        );

        return (
            <div className="investigator-workspace">

                <section className="investigator-stats-grid">
                    <div className="panel investigator-stat-card">
                        <span>ALL SUBMISSIONS</span>
                        <strong>{investigatorEvidence.length}</strong>
                    </div>

                    <div className="panel investigator-stat-card pending-stat">
                        <span>AWAITING REVIEW</span>
                        <strong>{pendingCount}</strong>
                    </div>

                    <div className="panel investigator-stat-card approved-stat">
                        <span>APPROVED</span>
                        <strong>{approvedCount}</strong>
                    </div>

                    <div className="panel investigator-stat-card rejected-stat">
                        <span>REJECTED</span>
                        <strong>{rejectedCount}</strong>
                    </div>
                </section>

                <section className="panel investigator-list-panel">
                    <div className="panel-header investigator-panel-header">
                        <div>
                            <h3>Evidence Review Queue</h3>
                            <p>
                                Review submissions and record decisions in the chain of custody.
                            </p>
                        </div>

                        <button
                            className="text-button"
                            onClick={fetchInvestigatorEvidence}
                            disabled={investigatorLoading}
                        >
                            {investigatorLoading ? "Refreshing..." : "↻ Refresh"}
                        </button>
                    </div>

                    <div className="investigator-filter-row">
                        <label htmlFor="investigator-status-filter">
                            Filter by status
                        </label>

                        <select
                            id="investigator-status-filter"
                            value={investigatorFilter}
                            onChange={(event) =>
                                setInvestigatorFilter(event.target.value)
                            }
                        >
                            <option value="all">All evidence</option>
                            <option value="pending">Pending</option>
                            <option value="verified">Verified</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>

                    {investigatorSuccess && (
                        <div className="investigator-feedback success-feedback">
                            {investigatorSuccess}
                        </div>
                    )}

                    {investigatorError && (
                        <div className="investigator-feedback error-feedback">
                            {investigatorError}
                        </div>
                    )}

                    {investigatorLoading ? (
                        <div className="evidence-message">
                            Loading submitted evidence...
                        </div>
                    ) : investigatorError && investigatorEvidence.length === 0 ? (
                        <div className="evidence-message">
                            Unable to load the review queue.
                        </div>
                    ) : filteredEvidence.length === 0 ? (
                        <div className="evidence-message">
                            <div className="empty-icon">▤</div>
                            <h3>No Evidence Found</h3>
                            <p>There are no records matching this filter.</p>
                        </div>
                    ) : (
                        <div className="investigator-evidence-list">
                            {filteredEvidence.map((item) => {
                                const isFinal = ["approved", "rejected"].includes(item.status);
                                const isBusy = reviewingEvidenceId === item._id;

                                return (
                                    <article
                                        className="investigator-evidence-card"
                                        key={item._id}
                                    >
                                        <div className="investigator-evidence-main">
                                            <div className="investigator-file-icon">
                                                {getFileType(item.fileType) === "IMAGE"
                                                    ? "▧"
                                                    : getFileType(item.fileType) === "VIDEO"
                                                        ? "▷"
                                                        : "▤"}
                                            </div>

                                            <div className="investigator-evidence-copy">
                                                <div className="investigator-title-row">
                                                    <h4>
                                                        {item.title || "Untitled evidence"}
                                                    </h4>

                                                    <span className={`status ${getStatusColor(item.status)}`}>
                                                        <span></span>
                                                        {item.status}
                                                    </span>
                                                </div>

                                                <p className="investigator-file-name">
                                                    {item.fileName || "File name unavailable"}
                                                </p>

                                                <div className="investigator-meta">
                                                    <span>
                                                        Submitted by:{" "}
                                                        <strong>
                                                            {item.submittedBy?.name || "Unknown user"}
                                                        </strong>
                                                    </span>

                                                    <span>
                                                        {item.submittedBy?.email || ""}
                                                    </span>

                                                    <span>{formatDate(item.createdAt)}</span>
                                                </div>

                                                {item.description && (
                                                    <p className="investigator-description">
                                                        {item.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="investigator-evidence-actions">
                                            {item.fileUrl && (
                                                <a
                                                    className="text-button"
                                                    href={item.fileUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    View File ↗
                                                </a>
                                            )}

                                            <button
                                                className="text-button"
                                                type="button"
                                                onClick={() => {
                                                    navigator.clipboard?.writeText(
                                                        item.fileHash || ""
                                                    );
                                                }}
                                                disabled={!item.fileHash}
                                            >
                                                Copy SHA-256
                                            </button>

                                            {!isFinal ? (
                                                <>
                                                    <button
                                                        className="review-approve-button"
                                                        type="button"
                                                        disabled={isBusy}
                                                        onClick={() =>
                                                            handleEvidenceReview(item, "approved")
                                                        }
                                                    >
                                                        {isBusy ? "Saving..." : "Approve"}
                                                    </button>

                                                    <button
                                                        className="review-reject-button"
                                                        type="button"
                                                        disabled={isBusy}
                                                        onClick={() =>
                                                            handleEvidenceReview(item, "rejected")
                                                        }
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="review-complete-label">
                                                    Review completed
                                                </span>
                                            )}
                                        </div>

                                        {item.fileHash && (
                                            <div className="investigator-hash-row">
                                                <span>SHA-256 FINGERPRINT</span>
                                                <code>{item.fileHash}</code>
                                            </div>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        );
    };

    // ACTIVITY HISTORY PAGE
    const renderActivityHistory = () => (
        <div className="panel history-panel">
            <div className="panel-header">
                <div>
                    <h3>Evidence Activity History</h3>
                    <p>
                        A chronological record of actions performed on your evidence.
                    </p>
                </div>

                <button
                    className="text-button"
                    onClick={fetchActivityHistory}
                    disabled={historyLoading}
                >
                    {historyLoading ? "Refreshing..." : "↻ Refresh"}
                </button>
            </div>

            {historyLoading ? (
                <div className="evidence-message">
                    Loading activity history...
                </div>
            ) : historyError ? (
                <div className="evidence-message evidence-error">
                    {historyError}
                    <button
                        className="text-button"
                        onClick={fetchActivityHistory}
                    >
                        Try Again
                    </button>
                </div>
            ) : activityHistory.length === 0 ? (
                <div className="evidence-message">
                    <div className="empty-icon">◷</div>
                    <h3>No Activity Yet</h3>
                    <p>
                        Upload or verify evidence to see its activity recorded here.
                    </p>
                </div>
            ) : (
                <>
                    <div className="history-summary">
                        <span>
                            {activityHistory.length} recorded{" "}
                            {activityHistory.length === 1 ? "event" : "events"}
                        </span>
                        <span>Newest activity first</span>
                    </div>

                    <div className="history-timeline">
                        {activityHistory.map((entry) => {
                            const action = entry.action || entry.event || entry.type;
                            const tone = getActivityTone(action);
                            const eventDate = entry.timestamp || entry.createdAt;

                            return (
                                <article
                                    className="history-item"
                                    key={entry.activityId}
                                >
                                    <div className={`history-marker ${tone}`}>
                                        {tone === "green"
                                            ? "✓"
                                            : tone === "red"
                                                ? "!"
                                                : tone === "blue"
                                                    ? "↑"
                                                    : "•"}
                                    </div>

                                    <div className="history-card">
                                        <div className="history-card-top">
                                            <div>
                                                <h4>{getActivityLabel(action)}</h4>
                                                <p className="history-evidence-title">
                                                    {entry.evidenceTitle || "Evidence record"}
                                                </p>
                                            </div>

                                            <span className={`history-tag ${tone}`}>
                                                {(action || "ACTIVITY").replaceAll("_", " ")}
                                            </span>
                                        </div>

                                        {entry.details && (
                                            <p className="history-details">
                                                {entry.details}
                                            </p>
                                        )}

                                        <div className="history-meta">
                                            <span>
                                                ◷ {formatActivityDate(eventDate)}
                                            </span>

                                            {entry.performedBy?.name && (
                                                <span>By {entry.performedBy.name}</span>
                                            )}

                                            {entry.evidenceFileName && (
                                                <span>{entry.evidenceFileName}</span>
                                            )}
                                        </div>

                                        {entry.fileHash && (
                                            <div className="history-hash">
                                                <span>SHA-256</span>
                                                <code>{entry.fileHash}</code>
                                            </div>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );

    return (
        <div className="app-container">

            <aside className="sidebar">

                <div className="brand">
                    <div className="brand-icon">P</div>
                    <div>
                        <h2>ProofPath</h2>
                        <span>Evidence Intelligence</span>
                    </div>
                </div>

                <div className="workspace-label">WORKSPACE</div>

                <nav className="navigation">
                    {navigation.map((item) => (
                        <button
                            key={item.name}
                            className={`nav-item ${
                                activePage === item.name ? "active" : ""
                            }`}
                            onClick={() => setActivePage(item.name)}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            {item.name}
                        </button>
                    ))}
                </nav>

                <div className="sidebar-bottom">

                    <div className="security-card">
                        <div className="security-icon">⬡</div>
                        <h4>Secure Workspace</h4>
                        <p>
                            Your evidence is protected using SHA-256 cryptographic
                            fingerprints.
                        </p>
                        <div className="security-status">
                            <span></span> All systems operational
                        </div>
                    </div>

                    <div className="profile-card">
                        <div className="avatar">
                            {user.name?.charAt(0).toUpperCase()}
                        </div>

                        <div className="profile-info">
                            <h4>{user.name}</h4>
                            <span>{user.role}</span>
                        </div>

                        <button
                            className="profile-menu"
                            onClick={handleLogout}
                            title="Logout"
                        >
                            ⇥
                        </button>
                    </div>
                </div>
            </aside>

            <main className="main-content">

                <header className="topbar">
                    <div className="breadcrumb">
                        Workspace <span>/</span> {activePage}
                    </div>

                    <div className="topbar-right">
                        <div className="system-indicator">
                            <span></span> SYSTEM OPERATIONAL
                        </div>

                        <div className="top-avatar">
                            {user.name?.charAt(0).toUpperCase()}
                        </div>
                    </div>
                </header>

                <div className="dashboard-content">

                    <div className="welcome-section">
                        <div>
                            <div className="date-label">
                                PROOFPATH WORKSPACE
                            </div>

                            <h1>
                                {activePage === "Dashboard"
                                    ? `Welcome back, ${user.name?.split(" ")[0]}`
                                    : activePage}
                            </h1>

                            <p>
                                {activePage === "Dashboard"
                                    ? "Here's an overview of your digital evidence."
                                    : `Manage your ${activePage.toLowerCase()} workspace.`}
                            </p>
                        </div>

                        <button
                            className="primary-button"
                            onClick={() => setActivePage("Upload Evidence")}
                        >
                            <span>＋</span> Upload Evidence
                        </button>
                    </div>

                    {activePage === "Admin Dashboard" && user?.role === "admin" ? (
                        <AdminDashboard currentUser={user} />
                    ) : activePage === "Investigator Dashboard" ? (
                        renderInvestigatorDashboard()
                    ) : activePage === "My Evidence" ? (
                        renderMyEvidence()
                    ) : activePage === "Upload Evidence" ? (
                        renderUploadEvidence()
                    ) : activePage === "Verify Evidence" ? (
                        renderVerifyEvidence()
                    ) : activePage === "Activity History" ? (
                        renderActivityHistory()
                    ) : activePage === "Evidence Details" ? (
                        renderEvidenceDetails()
                    ) : activePage === "Dashboard" ? (
                        <>
                            {/* DYNAMIC STATISTICS */}
                            <section className="stats-grid">
                                {stats.map((stat) => (
                                    <div className="stat-card" key={stat.title}>
                                        <div className="stat-top">
                                            <span>{stat.title}</span>
                                            <div className={`stat-icon ${stat.color}`}>
                                                {stat.icon}
                                            </div>
                                        </div>

                                        <h2>{stat.value}</h2>
                                        <p className={stat.color}>{stat.change}</p>
                                    </div>
                                ))}
                            </section>

                            {/* MAIN CONTENT */}
                            <section className="content-grid">

                                <div className="panel evidence-panel">
                                    <div className="panel-header">
                                        <div>
                                            <h3>Recent Evidence</h3>
                                            <p>Latest registered evidence records</p>
                                        </div>

                                        <button
                                            className="text-button"
                                            onClick={() => setActivePage("My Evidence")}
                                        >
                                            View All →
                                        </button>
                                    </div>

                                    {evidenceLoading ? (
                                        <div className="evidence-message">
                                            Loading recent evidence...
                                        </div>
                                    ) : evidenceError ? (
                                        <div className="evidence-message evidence-error">
                                            {evidenceError}
                                        </div>
                                    ) : evidence.length === 0 ? (
                                        <div className="evidence-message">
                                            No evidence registered yet.
                                        </div>
                                    ) : (
                                        <div className="table-container">
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th>EVIDENCE</th>
                                                        <th>FILE TYPE</th>
                                                        <th>SUBMITTED</th>
                                                        <th>STATUS</th>
                                                    </tr>
                                                </thead>

                                                <tbody>
                                                    {evidence.slice(0, 4).map((item) => (
                                                        <tr key={item._id}>
                                                            <td>
                                                                <div className="evidence-name">
                                                                    <div className="file-icon">
                                                                        {getFileType(item.fileType) === "IMAGE"
                                                                            ? "▧"
                                                                            : getFileType(item.fileType) === "VIDEO"
                                                                                ? "▷"
                                                                                : "▤"}
                                                                    </div>

                                                                    <div>
                                                                        <strong>{item.title}</strong>
                                                                        <span>{item.fileName}</span>
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            <td>
                                                                <span className="file-type">
                                                                    {getFileType(item.fileType)}
                                                                </span>
                                                            </td>

                                                            <td className="date-cell">
                                                                {formatDate(item.createdAt)}
                                                            </td>

                                                            <td>
                                                                <span className={`status ${getStatusColor(item.status)}`}>
                                                                    <span></span>
                                                                    {item.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                {/* INTEGRITY OVERVIEW */}
                                <div className="right-column">

                                    <div className="panel integrity-panel">
                                        <div className="panel-header">
                                            <div>
                                                <h3>Integrity Overview</h3>
                                                <p>Evidence verification summary</p>
                                            </div>
                                        </div>

                                        <div className="integrity-visual">
                                            <div
                                                className="integrity-circle"
                                                style={{
                                                    background: `conic-gradient(
                                                        #0891b2 0% ${integrityPercentage}%,
                                                        #26364c ${integrityPercentage}% 100%
                                                    )`
                                                }}
                                            >
                                                <div>
                                                    <strong>{integrityPercentage}%</strong>
                                                    <span>Verified</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="integrity-legend">
                                            <div>
                                                <span className="legend-dot green-dot"></span>
                                                Verified <strong>{verifiedCount}</strong>
                                            </div>

                                            <div>
                                                <span className="legend-dot yellow-dot"></span>
                                                Pending <strong>{pendingCount}</strong>
                                            </div>

                                            <div>
                                                <span className="legend-dot red-dot"></span>
                                                Rejected <strong>{rejectedCount}</strong>
                                            </div>

                                            <div>
                                                <span className="legend-dot blue-dot"></span>
                                                Approved <strong>{approvedCount}</strong>
                                            </div>
                                        </div>
                                    </div>

                                    {/* SHA-256 PROTECTION */}
                                    <div className="panel hash-panel">
                                        <div className="hash-icon">⌘</div>
                                        <h3>SHA-256 Protection</h3>

                                        <p>
                                            Every registered file receives a unique
                                            cryptographic fingerprint to detect
                                            unauthorized modifications.
                                        </p>

                                        <div className="hash-status">
                                            <span></span> Hash Engine Active
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* BOTTOM SECTION */}
                            <section className="bottom-grid">

                                <div className="panel activity-panel">
                                    <div className="panel-header">
                                        <div>
                                            <h3>Recent Activity</h3>
                                            <p>Latest actions in your workspace</p>
                                        </div>
                                    </div>

                                    <div className="activity-list">
                                        <div className="activity-item">
                                            <div className="activity-dot green-dot"></div>
                                            <div>
                                                <strong>
                                                    Evidence successfully verified
                                                </strong>
                                                <p>Evidence verification</p>
                                            </div>
                                            <span>Recent</span>
                                        </div>

                                        <div className="activity-item">
                                            <div className="activity-dot blue-dot"></div>
                                            <div>
                                                <strong>Evidence submitted</strong>
                                                <p>Evidence registration</p>
                                            </div>
                                            <span>Recent</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="panel quick-panel">
                                    <h3>Quick Actions</h3>

                                    <button
                                        onClick={() => setActivePage("Upload Evidence")}
                                    >
                                        <span>＋</span>
                                        Upload New Evidence
                                        <b>→</b>
                                    </button>

                                    <button
                                        onClick={() => setActivePage("Verify Evidence")}
                                    >
                                        <span>◈</span>
                                        Verify File Integrity
                                        <b>→</b>
                                    </button>

                                    <button
                                        onClick={() => setActivePage("Activity History")}
                                    >
                                        <span>◷</span>
                                        View Activity History
                                        <b>→</b>
                                    </button>
                                </div>
                            </section>
                        </>
                    ) : (
                        <div className="panel">
                            <h3>{activePage}</h3>
                            <p>
                                This section will be implemented in the next
                                development step.
                            </p>
                        </div>
                    )}

                    <footer className="footer">
                        <span>© 2026 ProofPath</span>
                        <span>Secure Digital Evidence Management</span>
                        <span>SHA-256 Protected</span>
                    </footer>

                </div>
            </main>
        </div>
    );
}

export default App;
