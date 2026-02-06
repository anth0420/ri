import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // 🔹 Al cargar la app, leer localStorage
    useEffect(() => {
        const storedUser = localStorage.getItem("authUser");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    // 🔹 Login
    const login = (userData) => {
        setUser(userData);
        localStorage.setItem("authUser", JSON.stringify(userData));
    };

    // 🔹 Logout
    const logout = () => {
        setUser(null);
        localStorage.removeItem("authUser");
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
