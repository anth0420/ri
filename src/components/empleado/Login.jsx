import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../styles/Login.css";
import logo from "../../assets/logo.png";

const API_URL = import.meta.env.VITE_API_URL;

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            /* ===============================
               1️⃣ VALIDAR EN EL SISTEMA PRIMERO
               (Verificar si usuario existe y está activo)
            =============================== */
            const preValidacionResponse = await fetch(
                `${API_URL}/api/Usuarios/validar-usuario`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username }),
                }
            );

            if (!preValidacionResponse.ok) {
                const errorData = await preValidacionResponse.json();
                throw new Error(errorData.error || "Error de validación");
            }

            /* ===============================
               2️⃣ VALIDAR EN ACTIVE DIRECTORY
            =============================== */
            const adResponse = await fetch(
                `${API_URL}/api/ActiveDirectory/validate`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password }),
                }
            );

            const adData = await adResponse.json();
            const adValido = adResponse.ok && adData.autenticado;

            /* ===============================
               3️⃣ VALIDAR PASSWORD EN EL SISTEMA
            =============================== */
            const passwordResponse = await fetch(
                `${API_URL}/api/Usuarios/validar-password`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        username,
                        adValido
                    }),
                }
            );

            const passwordData = await passwordResponse.json();

            if (!passwordResponse.ok) {
                throw new Error(passwordData.error || "Error de autenticación");
            }

            /* ===============================
               4️⃣ LOGIN EXITOSO - OBTENER DATOS
            =============================== */
            const loginResponse = await fetch(
                `${API_URL}/api/Usuarios/login`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username }),
                }
            );

            const loginData = await loginResponse.json();
            console.log("login: ", loginData)

            if (!loginResponse.ok) {
                throw new Error(loginData.error || "Acceso denegado");
            }

            /* ===============================
               5️⃣ GUARDAR SESIÓN
            =============================== */
            login({
                username,
                rol: loginData.rol,
                nombre: loginData.nombre,
            });

            /* ===============================
               6️⃣ REDIRECCIÓN POR ROL
            =============================== */
            if (loginData.rol === "admin") {
                navigate("/admin");
            } else {
                navigate("/empleado/gestor-solicitudes");
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-left">
                <h1 className="login-title">
                    Bienvenido al sistema
                    <br />
                    de emisión de
                    <br />
                    certificaciones
                </h1>
            </div>

            <div className="login-left">
                <div className="login-card">
                    <div className="login-logo">
                        <img
                            src={logo}
                            alt="Registro Inmobiliario República Dominicana"
                        />
                    </div>

                    <form onSubmit={handleLogin} className="login-form">
                        <div className="form-group">
                            <label htmlFor="username">Nombre de usuario</label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Contraseña</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>

                        {error && (
                            <div className="error-message">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="login-button"
                            disabled={loading}
                        >
                            {loading ? "Verificando..." : "Iniciar sesión"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}