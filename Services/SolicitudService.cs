using Microsoft.EntityFrameworkCore;
using ProyectoPasantiaRI.Server.Data;
using ProyectoPasantiaRI.Server.Models;
using ProyectoPasantiaRI.Server.Enums;

namespace ProyectoPasantiaRI.Server.Services
{
    public class SolicitudService
    {
        private readonly ApplicationDbContext _context;
        private static readonly SemaphoreSlim _semaphore = new SemaphoreSlim(1, 1);

        public SolicitudService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Solicitud> CrearSolicitudAsync(Solicitud solicitud)
        {
            // Usar semáforo para evitar condiciones de carrera con solicitudes concurrentes
            await _semaphore.WaitAsync();
            try
            {
                var numeroSolicitud = await GenerarNumeroSolicitudAsync();
                solicitud.AsignarNumeroSolicitud(numeroSolicitud);

                _context.Solicitudes.Add(solicitud);
                await _context.SaveChangesAsync();

                return solicitud;
            }
            finally
            {
                _semaphore.Release();
            }
        }

        private async Task<string> GenerarNumeroSolicitudAsync()
        {
            var fecha = DateTime.Now;
            var year = fecha.Year.ToString().Substring(2, 2);
            var month = fecha.Month.ToString("D2");
            var prefijo = $"{year}{month}";

            // Buscar el último número de solicitud del mes actual
            var ultimaSolicitud = await _context.Solicitudes
                .Where(s => s.NumeroSolicitud.StartsWith(prefijo))
                .OrderByDescending(s => s.NumeroSolicitud)
                .FirstOrDefaultAsync();

            int nuevoConsecutivo = 1;

            if (ultimaSolicitud != null)
            {
                // Extraer los últimos 3 dígitos y sumar 1
                var ultimoConsecutivo = int.Parse(ultimaSolicitud.NumeroSolicitud.Substring(4, 3));
                nuevoConsecutivo = ultimoConsecutivo + 1;

                // Validar que no se exceda el límite de 999 solicitudes por mes
                if (nuevoConsecutivo > 999)
                {
                    throw new InvalidOperationException("Se ha alcanzado el límite máximo de solicitudes para este mes (999)");
                }
            }

            return $"{prefijo}{nuevoConsecutivo:D3}";
        }

        // Métodos adicionales útiles

        public async Task<Solicitud?> ObtenerPorIdAsync(int id)
        {
            return await _context.Solicitudes.FindAsync(id);
        }

        public async Task<Solicitud?> ObtenerPorNumeroSolicitudAsync(string numeroSolicitud)
        {
            return await _context.Solicitudes
                .FirstOrDefaultAsync(s => s.NumeroSolicitud == numeroSolicitud);
        }

        public async Task<List<Solicitud>> ObtenerTodasAsync()
        {
            return await _context.Solicitudes
                .OrderByDescending(s => s.NumeroSolicitud)
                .ToListAsync();
        }

        public async Task<List<Solicitud>> ObtenerPorEstadoAsync(EstadoSolicitud estado)
        {
            return await _context.Solicitudes
                .Where(s => s.Estado == estado)
                .OrderByDescending(s => s.NumeroSolicitud)
                .ToListAsync();
        }

        public async Task<bool> MarcarComoHechoAsync(int id)
        {
            var solicitud = await _context.Solicitudes.FindAsync(id);
            if (solicitud == null)
                return false;

      
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> MarcarComoRechazadoAsync(int id)
        {
            var solicitud = await _context.Solicitudes.FindAsync(id);
            if (solicitud == null)
                return false;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ActualizarSolicitudAsync(int id, Solicitud solicitudActualizada)
        {
            var solicitud = await _context.Solicitudes.FindAsync(id);
            if (solicitud == null)
                return false;

            solicitud.Cedula = solicitudActualizada.Cedula;
            solicitud.Nombre = solicitudActualizada.Nombre;
            solicitud.Correo = solicitudActualizada.Correo;
            solicitud.Archivos = solicitudActualizada.Archivos;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> EliminarSolicitudAsync(int id)
        {
            var solicitud = await _context.Solicitudes.FindAsync(id);
            if (solicitud == null)
                return false;

            _context.Solicitudes.Remove(solicitud);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<int> ContarSolicitudesPorEstadoAsync(EstadoSolicitud estado)
        {
            return await _context.Solicitudes
                .CountAsync(s => s.Estado == estado);
        }

        public async Task<Dictionary<EstadoSolicitud, int>> ObtenerEstadisticasAsync()
        {
            return await _context.Solicitudes
                .GroupBy(s => s.Estado)
                .Select(g => new { Estado = g.Key, Cantidad = g.Count() })
                .ToDictionaryAsync(x => x.Estado, x => x.Cantidad);
        }
    }
}