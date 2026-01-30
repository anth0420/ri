import React, { useState, useEffect, useMemo } from 'react';
import logo from '../../assets/logo.png';
import '../../styles/GestorSolicitudes.css';
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;



const GestorSolicitudes = () => {
    /* ===============================
       ESTADO
    =============================== */
    const [activeTab, setActiveTab] = useState('pendientes');
    const [solicitudes, setSolicitudes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [certificacionesMap, setCertificacionesMap] = useState({});
    const ITEMS_PER_PAGE = 15;
    const navigate = useNavigate();

    /* ===============================
       CARGA DE DATOS
    =============================== */
    const fetchSolicitudes = async (silent = false) => {
        try {
            if (!silent) {
                setLoading(true);
            }
            const response = await fetch(`${API_URL}/api/Solicitudes`);
            if (!response.ok) throw new Error();
            const data = await response.json();
            setSolicitudes(data);
        } catch (error) {
            console.error(error);
            if (!silent) {
                alert('Error al cargar las solicitudes');
            }
        } finally {
            setLoading(false);

        }
    };
    const fetchCertificaciones = async (numeroSolicitud) => {
        try {
            const response = await fetch(
                `${API_URL}/api/Solicitudes/${numeroSolicitud}/certificaciones`
            );
            if (!response.ok) return;

            const data = await response.json();

            setCertificacionesMap(prev => ({
                ...prev,
                [numeroSolicitud]: data
            }));
        } catch (error) {
            console.error('Error cargando certificaciones:', error);
        }
    };

    // Carga inicial
    useEffect(() => {
        fetchSolicitudes();
    }, []);
    useEffect(() => {
        if (activeTab === 'completadas') {
            solicitudes
                .filter(s => s.estado === 3)
                .forEach(s => {
                    if (!certificacionesMap[s.numeroSolicitud]) {
                        fetchCertificaciones(s.numeroSolicitud);
                    }
                });
        }
    }, [activeTab, solicitudes]);


    // Polling automático cada 30 segundos
    useEffect(() => {
        const interval = setInterval(() => {
            fetchSolicitudes(true); // silent = true para no mostrar loading
        }, 30000); // 30 segundos

        return () => clearInterval(interval);
    }, []);

    // Función para refresh manual

    /* ===============================
       ESTADOS (ENUM VISUAL)
    =============================== */
    const getEstadoTexto = (estado) =>
    ({
        1: 'Nueva',
        2: 'En revisión',
        3: 'Completada',
        4: 'Rechazada',
        5: 'Espera respuesta usuario',
        6: 'Respuesta de usuario',
    }[estado] || 'Desconocido');

    // Prioridad para ordenamiento: Respuesta usuario (6) > Nueva (1) > Espera respuesta (5)
    const getEstadoPrioridad = (estado) =>
    ({
        6: 1, // Respuesta usuario (más alta prioridad)
        1: 2, // Nueva
        5: 3, // Espera respuesta usuario
    }[estado] || 99);

    /* ===============================
       FECHAS
       - Formato DD/MM/AA para ambas fechas
    =============================== */
    const formatearFechaCorta = (fecha) => {
        if (!fecha) return '—';

        const date = new Date(fecha);
        if (isNaN(date)) return '—';

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);

        return `${day}/${month}/${year}`;
    };

    /* ===============================
       FILTRO, BÚSQUEDA Y ORDEN
    =============================== */
    const solicitudesFiltradas = useMemo(() => {
        let data = [...solicitudes];

        // Filtrar por pestaña
        data =
            activeTab === 'pendientes'
                ? data.filter((s) => [1, 5, 6].includes(s.estado))
                : data.filter((s) => s.estado === 3); // Solo solicitudes completadas

        // Búsqueda - Excluye campos de Fecha y Acción/Certificaciones
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            data = data.filter(
                (s) =>
                    s.numeroSolicitud?.toLowerCase().includes(term) ||
                    s.nombre?.toLowerCase().includes(term) ||
                    (activeTab === 'pendientes' && s.cedula?.toLowerCase().includes(term)) ||
                    (activeTab === 'pendientes' && getEstadoTexto(s.estado).toLowerCase().includes(term))
            );
        }

        // Ordenamiento base (por defecto)
        if (!sortConfig.key) {
            if (activeTab === 'pendientes') {
                // Para pendientes: por prioridad de estado, luego por fecha (más antigua primero)
                data.sort((a, b) => {
                    const prioridad = getEstadoPrioridad(a.estado) - getEstadoPrioridad(b.estado);
                    if (prioridad !== 0) return prioridad;

                    const fechaA = new Date(a.fechaCreacion);
                    const fechaB = new Date(b.fechaCreacion);
                    return fechaA - fechaB;
                });
            } else {
                // Para completadas: por fecha de solicitud (más reciente primero)
                data.sort((a, b) => {
                    const fechaA = new Date(a.fechaCreacion);
                    const fechaB = new Date(b.fechaCreacion);
                    return fechaB - fechaA; // Descendente
                });
            }
        }

        // Ordenamiento manual (cuando el usuario hace clic en una columna)
        if (sortConfig.key) {
            data.sort((a, b) => {
                let aVal, bVal;

                switch (sortConfig.key) {
                    case 'numero':
                        aVal = a.numeroSolicitud?.toLowerCase() || '';
                        bVal = b.numeroSolicitud?.toLowerCase() || '';
                        break;
                    case 'solicitante':
                        aVal = a.nombre?.toLowerCase() || '';
                        bVal = b.nombre?.toLowerCase() || '';
                        break;
                    case 'fechaSolicitud':
                        aVal = new Date(a.fechaCreacion);
                        bVal = new Date(b.fechaCreacion);
                        break;
                    case 'fechaCertificacion':
                        aVal = new Date(a.fechaCertificacion || 0);
                        bVal = new Date(b.fechaCertificacion || 0);
                        break;
                    case 'estado':
                        aVal = getEstadoTexto(a.estado).toLowerCase();
                        bVal = getEstadoTexto(b.estado).toLowerCase();
                        break;
                    default:
                        return 0;
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return data;
    }, [solicitudes, activeTab, searchTerm, sortConfig]);

    /* ===============================
       PAGINACIÓN
    =============================== */
    const totalPages = Math.ceil(solicitudesFiltradas.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const solicitudesPaginadas = solicitudesFiltradas.slice(startIndex, endIndex);

    const PAGES_PER_BLOCK = 10;

    const currentBlock = Math.floor((currentPage - 1) / PAGES_PER_BLOCK);

    const startPage = currentBlock * PAGES_PER_BLOCK + 1;
    const endPage = Math.min(startPage + PAGES_PER_BLOCK - 1, totalPages);

    const visiblePages = Array.from(
        { length: endPage - startPage + 1 },
        (_, i) => startPage + i
    );
    // Resetear a página 1 cuando cambien los filtros
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeTab, sortConfig]);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    /* ===============================
       ORDENAMIENTO
    =============================== */
    const handleSort = (key) => {
        setSortConfig((prev) => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
        }));
    };

    const getSortIcon = (columnKey) => {
        if (sortConfig.key !== columnKey) {
            return <span className="sort-icon inactive">↕</span>;
        }
        return sortConfig.direction === 'asc' ?
            <span className="sort-icon active">↑</span> :
            <span className="sort-icon active">↓</span>;
    };

    /* ===============================
       ACCIONES
    =============================== */
    const puedeEditar = (estado) => estado === 1 || estado === 6;

    const handleEditar = (solicitud) => {
        navigate(`/empleado/responder/${solicitud.numeroSolicitud}`);
    };

    /* ===============================
       UI
    =============================== */
    return (
        <div className="gestor-wrapper">
            <div className="gestor-card">
                <div className="gestor-header">
                    <img src={logo} alt="Registro Inmobiliario" className="gestor-logo" />

                </div>

                <h1 className="gestor-title">
                    Módulo de gestión de solicitudes de exención de pasantías
                </h1>

                {/* Pestañas */}
                <div className="gestor-tabs">
                    <button
                        className={`gestor-tab ${activeTab === 'pendientes' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pendientes')}
                    >
                        Pendientes
                    </button>
                    <button
                        className={`gestor-tab ${activeTab === 'completadas' ? 'active' : ''}`}
                        onClick={() => setActiveTab('completadas')}
                    >
                        Completadas
                    </button>
                </div>

                {/* Buscador */}
                <div className="gestor-search">
                    <input
                        type="text"
                        placeholder={
                            activeTab === 'pendientes'
                                ? "Buscar por número, solicitante o estado..."
                                : "Buscar por número o solicitante..."
                        }
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                    {searchTerm && (
                        <button
                            className="clear-search"
                            onClick={() => setSearchTerm('')}
                            title="Limpiar búsqueda"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="gestor-loading">Cargando solicitudes...</div>
                ) : (
                    <>
                        <div className="gestor-table-wrapper">
                            {activeTab === 'pendientes' ? (
                                // TABLA PENDIENTES
                                <table className="gestor-table">
                                    <thead>
                                        <tr>
                                            <th onClick={() => handleSort('numero')}>
                                                Número {getSortIcon('numero')}
                                            </th>
                                            <th onClick={() => handleSort('solicitante')}>
                                                Solicitante {getSortIcon('solicitante')}
                                            </th>
                                            <th onClick={() => handleSort('fechaSolicitud')}>
                                                Fecha de solicitud {getSortIcon('fechaSolicitud')}
                                            </th>
                                            <th onClick={() => handleSort('estado')}>
                                                Estado {getSortIcon('estado')}
                                            </th>
                                            <th className="no-sort">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {solicitudesPaginadas.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="gestor-empty">
                                                    {searchTerm
                                                        ? 'No se encontraron resultados para tu búsqueda'
                                                        : 'No hay solicitudes pendientes'}
                                                </td>
                                            </tr>
                                        ) : (
                                            solicitudesPaginadas.map((s, index) => (
                                                <tr
                                                    key={s.id}
                                                    className={index % 2 === 0 ? 'row-even' : 'row-odd'}
                                                >
                                                    <td>{s.numeroSolicitud}</td>
                                                    <td>{s.nombre}</td>
                                                    <td>{formatearFechaCorta(s.fechaCreacion)}</td>
                                                    <td>{getEstadoTexto(s.estado)}</td>
                                                    <td className="action-cell">
                                                        {puedeEditar(s.estado) ? (
                                                            <button
                                                                type="button"
                                                                className="btn-action"
                                                                onClick={() => handleEditar(s)}
                                                                title="Responder solicitud"
                                                            >
                                                                <i className="bi bi-pencil"></i>
                                                            </button>
                                                        ) : (
                                                            <span className="action-disabled">—</span>
                                                        )}
                                                    </td>

                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            ) : (
                                // TABLA COMPLETADAS
                                <table className="gestor-table">
                                    <thead>
                                        <tr>
                                            <th onClick={() => handleSort('numero')}>
                                                Número {getSortIcon('numero')}
                                            </th>
                                            <th onClick={() => handleSort('solicitante')}>
                                                Solicitante {getSortIcon('solicitante')}
                                            </th>
                                            <th onClick={() => handleSort('fechaSolicitud')}>
                                                Fecha de solicitud {getSortIcon('fechaSolicitud')}
                                            </th>
                                            <th onClick={() => handleSort('fechaCertificacion')}>
                                                Fecha de certificación {getSortIcon('fechaCertificacion')}
                                            </th>
                                            <th className="no-sort">Certificaciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {solicitudesPaginadas.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="gestor-empty">
                                                    {searchTerm
                                                        ? 'No se encontraron resultados para tu búsqueda'
                                                        : 'No hay solicitudes completadas'}
                                                </td>
                                            </tr>
                                        ) : (
                                            solicitudesPaginadas.map((s, index) => (
                                                <tr
                                                    key={s.id}
                                                    className={index % 2 === 0 ? 'row-even' : 'row-odd'}
                                                >
                                                    <td>{s.numeroSolicitud}</td>
                                                    <td>{s.nombre}</td>
                                                    <td>{formatearFechaCorta(s.fechaCreacion)}</td>
                                                    <td>{formatearFechaCorta(s.fechaDevolucion)}</td>
                                                    <td className="action-cell">
                                                        {certificacionesMap[s.numeroSolicitud] &&
                                                            certificacionesMap[s.numeroSolicitud].length > 0 ? (

                                                            certificacionesMap[s.numeroSolicitud].length === 1 ? (
                                                                <button
                                                                    className="btn-download"
                                                                    onClick={() => {
                                                                        const cert = certificacionesMap[s.numeroSolicitud][0];
                                                                        window.open(
                                                                            `${API_URL}/api/Solicitudes/certificacion/${cert.id}`,
                                                                            '_blank',
                                                                            'noopener,noreferrer'
                                                                        );
                                                                    }}
                                                                    title={certificacionesMap[s.numeroSolicitud][0].nombreArchivo}
                                                                >
                                                                    📥
                                                                </button>
                                                            ) : (
                                                                <div className="certificaciones-list">
                                                                    {certificacionesMap[s.numeroSolicitud].map(cert => (
                                                                        <button
                                                                            key={cert.id}
                                                                            className="btn-download-small"
                                                                            onClick={() => {
                                                                                window.open(
                                                                                    `${API_URL}/api/Solicitudes/certificacion/${cert.id}`,
                                                                                    '_blank',
                                                                                    'noopener,noreferrer'
                                                                                );
                                                                            }}
                                                                            title={cert.nombreArchivo}
                                                                        >
                                                                            📄
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )

                                                        ) : (
                                                            <span className="action-disabled">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Paginación */}
                        {totalPages > 1 && (
                            <div className="gestor-pagination">

                                {/* Botón Anterior */}
                                {currentBlock > 0 && (
                                    <button
                                        className="page-nav"
                                        onClick={() => handlePageChange(startPage - 1)}
                                        title="Página anterior"
                                    >
                                        «
                                    </button>
                                )}
                                {/*Números de página visibles */}
                                {visiblePages.map((pageNum) => (
                                    <button
                                        key={pageNum}
                                        onClick={() => handlePageChange(pageNum)}
                                        className={`page-number ${currentPage === pageNum ? 'active' : ''}`}
                                    >
                                        {pageNum}
                                    </button>
                                ))}
                                {/* Botón Siguiente */}
                                {endPage < totalPages && (
                                    <button
                                        className="page-nav"
                                        onClick={() => handlePageChange(endPage + 1)}
                                        title="Página siguiente"
                                    >
                                        »
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Información de paginación */}
                        {solicitudesFiltradas.length > 0 && (
                            <div className="pagination-info">
                                Mostrando {startIndex + 1} - {Math.min(endIndex, solicitudesFiltradas.length)} de {solicitudesFiltradas.length} solicitudes
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default GestorSolicitudes;