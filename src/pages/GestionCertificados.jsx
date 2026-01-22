import React, { useState, useEffect } from 'react';
import { Search, Edit, ChevronUp, ChevronDown } from 'lucide-react';

const SolicitudesGestion = () => {
    const [activeTab, setActiveTab] = useState('pendientes');
    const [solicitudes, setSolicitudes] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [searchTerms, setSearchTerms] = useState({
        numero: '',
        solicitante: '',
        estado: ''
    });
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    // Mapeo de estados
    const estadoLabels = {
        0: 'Nueva',
        5: 'Espera respuesta usuario',
        6: 'Respuesta usuario',
        1: 'En revisión',
        2: 'Aprobada',
        3: 'Rechazada',
        4: 'Completada'
    };

    const estadoPrioridad = {
        6: 1, // Respuesta usuario (prioridad más alta)
        0: 2, // Nueva
        5: 3  // Espera respuesta usuario
    };

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Cargar datos del API
    useEffect(() => {
        fetchSolicitudes();
    }, []);

    const fetchSolicitudes = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/solicitudes');

            if (!response.ok) {
                throw new Error('Error al cargar las solicitudes');
            }

            const data = await response.json();
            setSolicitudes(data);
        } catch (error) {
            console.error('Error al cargar solicitudes:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Filtrar solicitudes según pestaña activa
    useEffect(() => {
        let filtered = [...solicitudes];

        if (activeTab === 'pendientes') {
            filtered = filtered.filter(s => [0, 5, 6].includes(s.estado));

            // Ordenar por prioridad y fecha
            filtered.sort((a, b) => {
                const prioridadDiff = estadoPrioridad[a.estado] - estadoPrioridad[b.estado];
                if (prioridadDiff !== 0) return prioridadDiff;
                return new Date(a.fechaSolicitud) - new Date(b.fechaSolicitud);
            });
        } else {
            filtered = filtered.filter(s => [1, 2, 3, 4].includes(s.estado));
            filtered.sort((a, b) => new Date(b.fechaSolicitud) - new Date(a.fechaSolicitud));
        }

        // Aplicar búsqueda
        if (searchTerms.numero) {
            filtered = filtered.filter(s =>
                s.numeroSolicitud.toLowerCase().includes(searchTerms.numero.toLowerCase())
            );
        }
        if (searchTerms.solicitante) {
            filtered = filtered.filter(s =>
                s.nombre.toLowerCase().includes(searchTerms.solicitante.toLowerCase())
            );
        }
        if (searchTerms.estado) {
            filtered = filtered.filter(s =>
                estadoLabels[s.estado].toLowerCase().includes(searchTerms.estado.toLowerCase())
            );
        }

        // Aplicar ordenamiento
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aVal, bVal;

                if (sortConfig.key === 'numero') {
                    aVal = a.numeroSolicitud;
                    bVal = b.numeroSolicitud;
                } else if (sortConfig.key === 'solicitante') {
                    aVal = a.nombre;
                    bVal = b.nombre;
                } else if (sortConfig.key === 'fecha') {
                    aVal = new Date(a.fechaSolicitud);
                    bVal = new Date(b.fechaSolicitud);
                } else if (sortConfig.key === 'estado') {
                    aVal = estadoLabels[a.estado];
                    bVal = estadoLabels[b.estado];
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        setFilteredData(filtered);
        setCurrentPage(1);
    }, [solicitudes, activeTab, searchTerms, sortConfig]);

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handleSearch = (field, value) => {
        setSearchTerms(prev => ({ ...prev, [field]: value }));
    };

    const handleEdit = (solicitud) => {
        // En producción, redirigir a página de edición
        alert(`Editar solicitud: ${solicitud.numeroSolicitud}`);
    };

    const formatFecha = (fecha) => {
        const date = new Date(fecha);
        const dia = String(date.getDate()).padStart(2, '0');
        const mes = String(date.getMonth() + 1).padStart(2, '0');
        const año = String(date.getFullYear()).slice(-2);
        return `${dia}/${mes}/${año}`;
    };

    const getEstadoColor = (estado) => {
        const colors = {
            0: 'bg-blue-100 text-blue-800',
            5: 'bg-yellow-100 text-yellow-800',
            6: 'bg-green-100 text-green-800',
            1: 'bg-purple-100 text-purple-800',
            2: 'bg-emerald-100 text-emerald-800',
            3: 'bg-red-100 text-red-800',
            4: 'bg-gray-100 text-gray-800'
        };
        return colors[estado] || 'bg-gray-100 text-gray-800';
    };

    // Paginación
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) {
            return <ChevronDown className="w-4 h-4 text-gray-400" />;
        }
        return sortConfig.direction === 'asc' ?
            <ChevronUp className="w-4 h-4 text-blue-600" /> :
            <ChevronDown className="w-4 h-4 text-blue-600" />;
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <img
                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Coat_of_arms_of_the_Dominican_Republic.svg/1200px-Coat_of_arms_of_the_Dominican_Republic.svg.png"
                        alt="Logo"
                        className="h-16 mb-4"
                    />
                    <h1 className="text-2xl font-bold text-gray-800">
                        Módulo de gestión de solicitudes de exención de pasantías
                    </h1>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-lg shadow">
                    <div className="border-b border-gray-200">
                        <div className="flex">
                            <button
                                onClick={() => setActiveTab('pendientes')}
                                className={`px-6 py-3 font-medium ${activeTab === 'pendientes'
                                        ? 'text-blue-600 border-b-2 border-blue-600'
                                        : 'text-gray-600 hover:text-gray-800'
                                    }`}
                            >
                                Pendientes
                            </button>
                            <button
                                onClick={() => setActiveTab('completadas')}
                                className={`px-6 py-3 font-medium ${activeTab === 'completadas'
                                        ? 'text-blue-600 border-b-2 border-blue-600'
                                        : 'text-gray-600 hover:text-gray-800'
                                    }`}
                            >
                                Completadas
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="p-6">
                        {loading ? (
                            <div className="flex justify-center items-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            </div>
                        ) : error ? (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                                <p className="font-medium">Error al cargar las solicitudes</p>
                                <p className="text-sm">{error}</p>
                                <button
                                    onClick={fetchSolicitudes}
                                    className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                                >
                                    Intentar nuevamente
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-blue-600 text-white">
                                                <th className="px-4 py-3 text-left">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleSort('numero')}
                                                            className="flex items-center gap-1 hover:text-blue-100"
                                                        >
                                                            Número
                                                            <SortIcon columnKey="numero" />
                                                        </button>
                                                    </div>
                                                </th>
                                                <th className="px-4 py-3 text-left">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleSort('solicitante')}
                                                            className="flex items-center gap-1 hover:text-blue-100"
                                                        >
                                                            Solicitante
                                                            <SortIcon columnKey="solicitante" />
                                                        </button>
                                                    </div>
                                                </th>
                                                <th className="px-4 py-3 text-left">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleSort('fecha')}
                                                            className="flex items-center gap-1 hover:text-blue-100"
                                                        >
                                                            Fecha de solicitud
                                                            <SortIcon columnKey="fecha" />
                                                        </button>
                                                    </div>
                                                </th>
                                                <th className="px-4 py-3 text-left">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleSort('estado')}
                                                            className="flex items-center gap-1 hover:text-blue-100"
                                                        >
                                                            Estado
                                                            <SortIcon columnKey="estado" />
                                                        </button>
                                                    </div>
                                                </th>
                                                <th className="px-4 py-3 text-left">Acción</th>
                                            </tr>
                                            <tr className="bg-gray-50">
                                                <th className="px-4 py-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar..."
                                                        value={searchTerms.numero}
                                                        onChange={(e) => handleSearch('numero', e.target.value)}
                                                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </th>
                                                <th className="px-4 py-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar..."
                                                        value={searchTerms.solicitante}
                                                        onChange={(e) => handleSearch('solicitante', e.target.value)}
                                                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </th>
                                                <th className="px-4 py-2"></th>
                                                <th className="px-4 py-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar..."
                                                        value={searchTerms.estado}
                                                        onChange={(e) => handleSearch('estado', e.target.value)}
                                                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </th>
                                                <th className="px-4 py-2"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentItems.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                                                        No se encontraron solicitudes
                                                    </td>
                                                </tr>
                                            ) : (
                                                currentItems.map((solicitud) => (
                                                    <tr key={solicitud.id} className="border-b border-gray-200 hover:bg-gray-50">
                                                        <td className="px-4 py-3 text-sm">{solicitud.numeroSolicitud}</td>
                                                        <td className="px-4 py-3 text-sm">{solicitud.nombre}</td>
                                                        <td className="px-4 py-3 text-sm">{formatFecha(solicitud.fechaSolicitud)}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getEstadoColor(solicitud.estado)}`}>
                                                                {estadoLabels[solicitud.estado]}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {(solicitud.estado === 0 || solicitud.estado === 6) && (
                                                                <button
                                                                    onClick={() => handleEdit(solicitud)}
                                                                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Paginación */}
                                {totalPages > 1 && (
                                    <div className="mt-4 flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Anterior
                                        </button>
                                        {[...Array(totalPages)].map((_, i) => (
                                            <button
                                                key={i + 1}
                                                onClick={() => setCurrentPage(i + 1)}
                                                className={`px-3 py-1 border rounded ${currentPage === i + 1
                                                        ? 'bg-blue-600 text-white border-blue-600'
                                                        : 'border-gray-300 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {i + 1}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Siguiente
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SolicitudesGestion;