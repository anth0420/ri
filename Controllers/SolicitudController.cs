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
        private readonly SolicitudEmailService _emailService;

        public SolicitudesController(
            ApplicationDbContext context,
            IWebHostEnvironment env,
            SolicitudService solicitudService,
            SolicitudEmailService emailService)
        {
            _context = context;
            _env = env;
            _solicitudService = solicitudService;
            _emailService = emailService;
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
                Correo = dto.Correo
            };

            solicitud.MarcarNueva();

            await _solicitudService.CrearSolicitudAsync(solicitud);
            await GuardarArchivos(dto.Archivos.ToList(), solicitud.Id, true);

            // ✅ NO BLOQUEA - Encola el correo para envío en 10 segundos
            _emailService.EnviarCorreoSolicitudCreada(solicitud);

            // ✅ Responde inmediatamente
            return Ok(new
            {
                solicitud.Id,
                solicitud.NumeroSolicitud
            });
        }

        // =========================
        // CONSULTAR SOLICITUD
        // =========================
        [HttpGet("{numeroSolicitud}")]
        public async Task<IActionResult> ObtenerPorNumero(string numeroSolicitud)
        {
            var solicitud = await _context.Solicitudes
                .Include(s => s.Archivos)
                .Include(s => s.Historial)
                .FirstOrDefaultAsync(s => s.NumeroSolicitud == numeroSolicitud);

            if (solicitud == null)
                return NotFound("Número de solicitud incorrecto.");

            return Ok(new SolicitudResponseDto
            {
                Id = solicitud.Id,
                NumeroSolicitud = solicitud.NumeroSolicitud,
                Cedula = solicitud.Cedula,
                Nombre = solicitud.Nombre,
                Correo = solicitud.Correo,
                Estado = (int)solicitud.Estado,
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
                        Comentario = h.Comentario
                    }).ToList()
            });
        }

        // =========================
        // USUARIO ENVÍA CORRECCIÓN
        // =========================
        [HttpPost("{numeroSolicitud}/archivos")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> ResponderSolicitud(
            string numeroSolicitud,
            [FromForm] ActualizarArchivos dto)
        {
            var solicitud = await _context.Solicitudes
                .Include(s => s.Archivos)
                .FirstOrDefaultAsync(s => s.NumeroSolicitud == numeroSolicitud);

            if (solicitud == null)
                return NotFound("Solicitud no encontrada");

            if (solicitud.Estado != EstadoSolicitud.PendienteRespuesta)
            {
                return BadRequest("Solo se pueden enviar correcciones cuando la solicitud está en estado 'Pendiente de respuesta'");
            }

            var historial = new SolicitudHistorial
            {
                SolicitudId = solicitud.Id,
                FechaDevolucion = DateTime.Now,
                Comentario = "Corrección enviada por el usuario"
            };

            foreach (var archivo in solicitud.Archivos.Where(a => a.EsActual))
            {
                archivo.EsActual = false;
                archivo.SolicitudHistorial = historial;
            }

            _context.SolicitudHistorials.Add(historial);
            await GuardarArchivos(dto.Archivos, solicitud.Id, true);

            solicitud.MarcarRespuestaUsuario();
            await _context.SaveChangesAsync();

            // ✅ NO BLOQUEA - Encola el correo
            _emailService.EnviarCorreoEstadoActualizado(solicitud, "Respuesta de usuario");

            return Ok("Corrección enviada correctamente");
        }

        // =========================
        // DNMC DEVUELVE SOLICITUD
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
            }

            solicitud.MarcarPendienteRespuesta();
            _context.SolicitudHistorials.Add(historial);
            await _context.SaveChangesAsync();

            // ✅ NO BLOQUEA - Encola el correo
            _emailService.EnviarCorreoDevolucion(solicitud, comentario);

            return Ok("Solicitud devuelta al usuario");
        }

        // =========================
        // GUARDAR ARCHIVOS
        // =========================
        private async Task GuardarArchivos(
            List<IFormFile> archivos,
            int solicitudId,
            bool esActual)
        {
            var uploadsPath = Path.Combine(_env.ContentRootPath, "uploads");
            Directory.CreateDirectory(uploadsPath);

            foreach (var archivo in archivos)
            {
                var nombre = $"{Guid.NewGuid()}_{archivo.FileName}";
                var ruta = Path.Combine(uploadsPath, nombre);

                using var stream = new FileStream(ruta, FileMode.Create);
                await archivo.CopyToAsync(stream);

                _context.SolicitudArchivos.Add(new SolicitudArchivo
                {
                    SolicitudId = solicitudId,
                    NombreArchivo = archivo.FileName,
                    Ruta = nombre,
                    EsActual = esActual
                });
            }

            await _context.SaveChangesAsync();
        }
    }
}