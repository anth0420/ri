using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProyectoPasantiaRI.Server.Data;
using ProyectoPasantiaRI.Server.DTOs;
using ProyectoPasantiaRI.Server.Models;
using ProyectoPasantiaRI.Server.Services;
using ProyectoPasantiaRI.Server.Enums;

namespace ProyectoPasantiaRI.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SolicitudesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IWebHostEnvironment _env;
        private readonly SolicitudService _solicitudService;
        private readonly SolicitudEmailService _solicitudEmailService;

        public SolicitudesController(
            ApplicationDbContext context,
            IWebHostEnvironment env,
            SolicitudService solicitudService,
            SolicitudEmailService solicitudEmailService)
        {
            _context = context;
            _env = env;
            _solicitudService = solicitudService;
            _solicitudEmailService = solicitudEmailService;
        }

        // =========================
        // CREAR SOLICITUD
        // =========================
        [HttpPost]
        public async Task<IActionResult> CrearSolicitud([FromForm] CrearSolicitudDto dto)
        {
            var solicitud = new Solicitud
            {
                Cedula = dto.Cedula,
                Nombre = dto.Nombre,
                Correo = dto.Correo,
          
               
            };
             
            solicitud.MarcarNueva();

            await _solicitudService.CrearSolicitudAsync(solicitud);

            await GuardarArchivos(dto.Archivos.ToList(), solicitud.Id, true);

            _solicitudEmailService.EnviarCorreoSolicitudCreadaAsync(solicitud);

            return Ok(new
            {
                solicitud.Id,
                solicitud.NumeroSolicitud
            });
        }

        // =========================
        // CONSULTAR POR NÚMERO
        // =========================
        [HttpGet("{numeroSolicitud}")]
        public async Task<IActionResult> ObtenerPorNumero(string numeroSolicitud)
        {
            var solicitud = await _context.Solicitudes
                .Include(s => s.Archivos)
                .Include(s => s.Historial)
                    .ThenInclude(h => h.ArchivosReemplazados)
                .FirstOrDefaultAsync(s => s.NumeroSolicitud == numeroSolicitud);

            if (solicitud == null)
                return NotFound("Número de solicitud incorrecto, favor verificar.");

            var response = new SolicitudResponseDto
            {
                Id = solicitud.Id,
                NumeroSolicitud = solicitud.NumeroSolicitud,
                Cedula = solicitud.Cedula,
                Nombre = solicitud.Nombre,
                Correo = solicitud.Correo,
                Estado = solicitud.Historial.Any()
                    ? "Pendiente de respuesta"
                    : solicitud.Estado.ToString(),

                ArchivosActuales = solicitud.Archivos
                    .Where(a => a.EsActual)
                    .Select(a => new SolicitudArchivoResponseDto
                    {
                        Id = a.Id,
                        NombreOriginal = a.NombreArchivo,
                        EsActual = a.EsActual
                    }).ToList(),

                Historial = solicitud.Historial
                    .OrderByDescending(h => h.FechaDevolucion)
                    .Select(h => new SolicitudHistorialResponseDto
                    {
                        FechaDevolucion = h.FechaDevolucion,
                        Comentario = h.Comentario,
                        Archivos = h.ArchivosReemplazados
                            .Select(a => a.NombreArchivo)
                            .ToList()
                    }).ToList()
            };

            return Ok(response);
        }

        // =========================
        // LISTAR SOLICITUDES
        // =========================
        [HttpGet]
        public async Task<IActionResult> ListarSolicitudes()
        {
            var solicitudes = await _context.Solicitudes
                .Select(s => new
                {
                    s.Id,
                    s.NumeroSolicitud,
                    s.Nombre,
                    s.Correo,
                    TotalArchivos = s.Archivos.Count
                })
                .ToListAsync();

            return Ok(solicitudes);
        }

        // =========================
        // DESCARGAR ARCHIVO
        // =========================
        [HttpGet("archivo/{archivoId}")]
        public async Task<IActionResult> DescargarArchivo(int archivoId)
        {
            var archivo = await _context.SolicitudArchivos.FindAsync(archivoId);
            if (archivo == null)
                return NotFound();

            var path = Path.Combine(_env.ContentRootPath, "uploads", archivo.Ruta);
            if (!System.IO.File.Exists(path))
                return NotFound("Archivo no existe");

            return PhysicalFile(path, "application/octet-stream", archivo.NombreArchivo);
        }

        // =========================
        // SUBIR NUEVA VERSIÓN (CIUDADANO)
        // =========================
        [HttpPost("{numeroSolicitud}/archivos")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> ActualizarArchivos(
            string numeroSolicitud,
            [FromForm] ActualizarArchivos dto)
        {
            var solicitud = await _context.Solicitudes
                .Include(s => s.Archivos)
                .FirstOrDefaultAsync(s => s.NumeroSolicitud == numeroSolicitud);

            if (solicitud == null)
                return NotFound("Solicitud no encontrada");

            // Crear historial
            var historial = new SolicitudHistorial
            {
                SolicitudId = solicitud.Id,
                FechaDevolucion = DateTime.Now,
                Comentario = "Actualización de documentos"
            };

            // Marcar SOLO los archivos actuales como históricos
            foreach (var archivo in solicitud.Archivos.Where(a => a.EsActual))
            {
                archivo.EsActual = false;
                archivo.SolicitudHistorial = historial;
                historial.ArchivosReemplazados.Add(archivo);
            }

            _context.SolicitudHistorials.Add(historial);

            // Guardar nuevos archivos como actuales
            await GuardarArchivos(dto.Archivos, solicitud.Id, true);

            solicitud.MarcarPendienteRespuesta();

            await _context.SaveChangesAsync();

            return Ok("Archivos actualizados correctamente");
        }

        // =========================
        // DEVOLVER SOLICITUD (DNMC)
        // =========================
        [HttpPost("{solicitudId}/devolver")]
        public async Task<IActionResult> DevolverSolicitud(
            int solicitudId,
            [FromBody] string comentario)
        {
            var solicitud = await _context.Solicitudes
                .Include(s => s.Archivos)
                .FirstOrDefaultAsync(s => s.Id == solicitudId);

            if (solicitud == null)
                return NotFound();

            var historial = new SolicitudHistorial
            {
                SolicitudId = solicitudId,
                FechaDevolucion = DateTime.Now,
                Comentario = comentario
            };

            foreach (var archivo in solicitud.Archivos.Where(a => a.EsActual))
            {
                archivo.EsActual = false;
                archivo.SolicitudHistorial = historial;
                historial.ArchivosReemplazados.Add(archivo);
            }

            solicitud.MarcarPendienteRespuesta();

            _context.SolicitudHistorials.Add(historial);
            await _context.SaveChangesAsync();

            return Ok("Solicitud devuelta con correcciones");
        }

        // =========================
        // MÉTODO PRIVADO GUARDAR ARCHIVOS
        // =========================
        private async Task GuardarArchivos(
            List<IFormFile> archivos,
            int solicitudId,
            bool esActual)
        {
            var uploadsPath = Path.Combine(_env.ContentRootPath, "uploads");
            if (!Directory.Exists(uploadsPath))
                Directory.CreateDirectory(uploadsPath);

            foreach (var archivo in archivos)
            {
                var nombreArchivo = $"{Guid.NewGuid()}_{archivo.FileName}";
                var rutaFisica = Path.Combine(uploadsPath, nombreArchivo);

                using var stream = new FileStream(rutaFisica, FileMode.Create);
                await archivo.CopyToAsync(stream);

                var entidad = new SolicitudArchivo
                {
                    SolicitudId = solicitudId,
                    NombreArchivo = archivo.FileName,
                    Ruta = nombreArchivo,
                    EsActual = esActual
                };

                _context.SolicitudArchivos.Add(entidad);
            }

            await _context.SaveChangesAsync();
        }
    }
}
