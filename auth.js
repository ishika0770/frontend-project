const AUTH = (() => {
    const SESSION_KEY = 'studyflow_session';
    const CREDS_KEY = 'studyflow_creds';

    const BASE_URL = 'https://cuiet.codebrigade.in';
    const SCHOOL_CODE = '800002';

    async function signIn({ username, password }) {
        if (!username || !password) {
            return { ok: false, message: 'Please fill in all fields.' };
        }

        try {
            const res = await fetch(`${BASE_URL}/mobile/appLoginAuthV2`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `txtUsername=${encodeURIComponent(username)}&txtPassword=${encodeURIComponent(password)}`
            });

            const data = await res.json();

            const status = String(data.status);
            if (!data || status === '0' || !data.data || !data.data.length) {
                return {
                    ok: false,
                    message: data?.message || 'Invalid credentials. Check your roll number and password.'
                };
            }

            const user = data.data[0];
            const session = {
                userId: user.userId,
                sessionId: user.sessionId,
                roleId: user.roleId,
                studentName: user.name || user.profileName || '',
                studentId: user.studentId || '',
                photo: user.photo || ''
            };
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));

            localStorage.setItem(CREDS_KEY, JSON.stringify({ username, password }));

            return { ok: true, message: `Welcome, ${session.studentName || username}!` };

        } catch (err) {
            return { ok: false, message: 'Network error. Check your connection.' };
        }
    }

    async function fetchPage(commonPageId) {
        const session = getSession();
        if (!session) return null;

        try {
            const res = await fetch(`${BASE_URL}/mobile/commonPage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    schoolCode: SCHOOL_CODE,
                    userId: session.userId,
                    sessionId: session.sessionId,
                    roleId: session.roleId || '',
                    commonPageId: String(commonPageId)
                }).toString()
            });

            const data = await res.json();

            if (!data || !data.content) return null;
            return data.content;
        } catch (err) {
            return null;
        }
    }

    function getSession() {
        const raw = sessionStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    }

    function getCurrentUser() {
        const session = getSession();
        if (!session) return null;
        const creds = JSON.parse(localStorage.getItem(CREDS_KEY) || '{}');
        return {
            name: session.studentName || 'Student',
            roll: creds.username || session.userId || '',
            photo: session.photo || ''
        };
    }

    function isLoggedIn() { return getSession() !== null; }

    function logout() {
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(CREDS_KEY);
    }

    return { signIn, fetchPage, getCurrentUser, isLoggedIn, logout };
})();
