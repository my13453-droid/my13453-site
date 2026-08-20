import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://ukzxcamswsbduskfglce.supabase.co",
  "sb_publishable_y7bTIcVQW8L0b2FU-pEQkQ_v8VSAnoJ",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
    },
  }
);

const PRESENT = ["present", "حضور", "حاضر"];
const ABSENT = ["absent", "غياب", "غائب"];

function normalizeAttendanceStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isPresent(value) {
  return PRESENT.includes(
    normalizeAttendanceStatus(value)
  );
}

function isAbsent(value) {
  return ABSENT.includes(
    normalizeAttendanceStatus(value)
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        setError(error.message);
      }

      setSession(data?.session || null);
      setLoading(false);
    }

    restoreSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession || null);
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session) {
      loadDashboard();
    }
  }, [session]);

  async function loadDashboard() {
    setError("");

    const workersResult = await supabase
      .from("workers")
      .select("*")
      .order("worker_code", { ascending: true });

    if (workersResult.error) {
      setError(
        "تعذر تحميل العمالة: " +
          workersResult.error.message
      );
      return;
    }

    const attendanceResult = await supabase
      .from("attendance")
      .select("*");

    if (attendanceResult.error) {
      setError(
        "تعذر تحميل الحضور: " +
          attendanceResult.error.message
      );
      return;
    }

    setWorkers(workersResult.data || []);
    setAttendance(attendanceResult.data || []);
  }

  async function login(event) {
    event.preventDefault();

    setError("");
    setLoginLoading(true);

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    setLoginLoading(false);

    if (error) {
      setError(
        "فشل تسجيل الدخول: " +
          error.message
      );
      return;
    }

    setSession(data.session);
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
    setSelectedWorker(null);
  }

  function getWorkerStats(workerId) {
    const rows = attendance.filter(
      (row) => row.worker_id === workerId
    );

    const presentDays = rows.filter((row) =>
      isPresent(row.attendance_status)
    ).length;

    const absentDays = rows.filter((row) =>
      isAbsent(row.attendance_status)
    ).length;

    return {
      presentDays,
      absentDays,
      totalDays: rows.length,
    };
  }

  function selectWorker(worker) {
    const stats = getWorkerStats(worker.id);

    setSelectedWorker({
      ...worker,
      ...stats,
    });

    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth",
    });
  }

  const today =
    new Date().toISOString().split("T")[0];

  const presentToday = attendance.filter(
    (row) =>
      row.attendance_date === today &&
      isPresent(row.attendance_status)
  ).length;

  const absentToday =  login,
  loading,
  error,
}) {
  return (
    <div style={styles.loginPage}>

      <form
        onSubmit={login}
        style={styles.loginCard}
      >

        <h1 style={styles.loginTitle}>
          منظومة متابعة العمالة المعاونة
        </h1>

        <p style={styles.loginSubtitle}>
          تسجيل دخول الإدارة
        </p>

        <input
          type="email"
          placeholder="البريد الإلكتروني"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          style={styles.input}
          required
        />

        <input
          type="password"
          placeholder="كلمة المرور"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          style={styles.input}
          required
        />

        <button
          type="submit"
          style={styles.loginButton}
          disabled={loading}
        >
          {loading ? "جارٍ الدخول..." : "تسجيل الدخول"}
        </button>

        {error && (
          <div style={styles.loginError}>
            {error}
          </div>
        )}

      </form>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statTitle}>
        {title}
      </div>

      <div style={styles.statValue}>
        {value}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f7fa",
    padding: "20px",
    direction: "rtl",
    fontFamily:
      "Arial, Tahoma, sans-serif",
    boxSizing: "border-box",
  },

  header: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "20px",
    marginBottom: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    boxShadow:
      "0 5px 20px rgba(0,0,0,.06)",
  },

  title: {
    margin: 0,
    fontSize: "28px",
  },

  email: {
    marginTop: "7px",
    color: "#667085",
  },

  logout: {
    border: 0,
    borderRadius: "10px",
    padding: "12px 18px",
    background: "#b42318",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
  },

  errorBox: {
    background: "#fee4e2",
    color: "#b42318",
    padding: "14px",
    borderRadius: "12px",
    marginBottom: "15px",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4, minmax(0, 1fr))",
    gap: "15px",
    marginBottom: "20px",
  },

  statCard: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "20px",
    textAlign: "center",
    boxShadow:
      "0 5px 20px rgba(0,0,0,.05)",
  },

  statTitle: {
    color: "#667085",
    fontSize: "15px",
    marginBottom: "10px",
  },

  statValue: {
    fontSize: "32px",
    fontWeight: "bold",
  },

  section: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "20px",
    marginBottom: "20px",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
  },

  refresh: {
    border: 0,
    borderRadius: "10px",
    padding: "10px 15px",
    cursor: "pointer",
  },

  workersGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px",
  },

  worker: {
    border: "1px solid #e4e7ec",
    borderRadius: "14px",
    background: "#f9fafb",
    padding: "16px",
    textAlign: "right",
    cursor: "pointer",
  },

  workerName: {
    fontWeight: "bold",
    fontSize: "17px",
    marginBottom: "8px",
  },

  workerCode: {
    color: "#667085",
    marginBottom: "8px",
  },

  workerDays: {
    fontWeight: "bold",
  },

  details: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "25px",
    position: "relative",
  },

  close: {
    position: "absolute",
    left: "18px",
    top: "18px",
    border: 0,
    background: "#eeeeee",
    borderRadius: "50%",
    width: "35px",
    height: "35px",
    fontSize: "24px",
    cursor: "pointer",
  },

  workerStats: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, minmax(0, 1fr))",
    gap: "15px",
    marginTop: "20px",
  },

  empty: {
    textAlign: "center",
    padding: "30px",
    color: "#667085",
  },

  loginPage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f4f7fa",
    direction: "rtl",
    padding: "20px",
    boxSizing: "border-box",
  },

  loginCard: {
    width: "100%",
    maxWidth: "430px",
    background: "#ffffff",
    borderRadius: "20px",
    padding: "30px",
    boxSizing: "border-box",
    boxShadow:
      "0 10px 35px rgba(0,0,0,.08)",
  },

  loginTitle: {
    textAlign: "center",
    marginBottom: "8px",
  },

  loginSubtitle: {
    textAlign: "center",
    color: "#667085",
    marginBottom: "25px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "14px",
    border: "1px solid #d0d5dd",
    borderRadius: "10px",
    marginBottom: "12px",
    fontSize: "16px",
  },

  loginButton: {
    width: "100%",
    border: 0,
    borderRadius: "10px",
    padding: "14px",
    background: "#1261a0",
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: "16px",
    cursor: "pointer",
  },

  loginError: {
    color: "#b42318",
    background: "#fee4e2",
    padding: "12px",
    borderRadius: "10px",
    marginTop: "15px",
  },

  center: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    direction: "rtl",
  },
};
