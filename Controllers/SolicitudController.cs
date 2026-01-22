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

            // Fire-and-forget: enviar correo en segundo plano
            _ = Task.Run(async () =>
            {
                try
                {
                    await _emailService.EnviarCorreoSolicitudCreadaAsync(solicitud);
                }
                catch (Exception ex)
                {
                    // Aquí puedes registrar el error en logs, no relanzar
                    Console.WriteLine($"Error enviando correo: {ex.Message}");
                }
            });

            // Responder inmediatamente
            return Ok(new
            {
                solicitud.Id,
                solicitud.NumeroSolicitud
            });
        }

        // =====================================
        // Gestionar todas las solicitudes
        // =====================================

        [HttpGet]
        public async Task<IActionResult> ObtenerSolicitudes()
        {
            var solicitud = await _context.Solicitudes.ToListAsync();

            if (solicitud == null)
                return NotFound("No se encontraron Solicitudes");

            return Ok(solicitud);
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
                Estado = (int)solicitud.Estado, // Devolver como número
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
        // USUARIO ENVÍA CORRECCIÓN (Solo si estado = PendienteRespuesta)
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

            // ✅ Verificar que el estado sea PendienteRespuesta (5)
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

            // Marcar archivos actuales como históricos
            foreach (var archivo in solicitud.Archivos.Where(a => a.EsActual))
            {
                archivo.EsActual = false;
                archivo.SolicitudHistorial = historial;
            }

            _context.SolicitudHistorials.Add(historial);

            // Guardar nuevos archivos
            await GuardarArchivos(dto.Archivos, solicitud.Id, true);

            // ✅ Cambiar estado a RespuestaUsuario (6)
            solicitud.MarcarRespuestaUsuario();
            await _context.SaveChangesAsync();

            // Fire-and-forget: enviar correo en segundo plano
            _ = Task.Run(async () =>
            {
                try
                {
                    await _emailService.EnviarCorreoEstadoActualizadoAsync(solicitud,
                        "Respuesta de usuario"
                    );
                }
                catch (Exception ex)
                {
                    // Aquí puedes registrar el error en logs, no relanzar
                    Console.WriteLine($"Error enviando correo: {ex.Message}");
                }
            });

            return Ok("Corrección enviada correctamente");
        }

        // =========================
        // DNMC DEVUELVE SOLICITUD (Cambia estado a PendienteRespuesta)
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

            // Marcar archivos actuales como históricos
            foreach (var archivo in solicitud.Archivos.Where(a => a.EsActual))
            {
                archivo.EsActual = false;
                archivo.SolicitudHistorial = historial;
            }

            // ✅ Cambiar estado a PendienteRespuesta (5) para que el usuario pueda responder
            solicitud.MarcarPendienteRespuesta();

            _context.SolicitudHistorials.Add(historial);
            await _context.SaveChangesAsync();


            // Fire-and-forget: enviar correo en segundo plano
            _ = Task.Run(async () =>
            {
                try
                {
                    await _emailService.EnviarCorreoDevolucionAsync(solicitud,comentario);
                }
                catch (Exception ex)
                {
                    // Aquí puedes registrar el error en logs, no relanzar
                    Console.WriteLine($"Error enviando correo: {ex.Message}");
                }
            });

            return Ok("Solicitud devuelta al usuario");
        }
        [HttpGet("archivo/{archivoId}")]
        public async Task<IActionResult> DescargarArchivo(int archivoId)
        {
            var archivo = await _context.SolicitudArchivos
                .FirstOrDefaultAsync(a => a.Id == archivoId);

            if (archivo == null)
                return NotFound("Archivo no encontrado");

            var uploadsPath = Path.Combine(_env.ContentRootPath, "uploads");
            var filePath = Path.Combine(uploadsPath, archivo.Ruta);

            if (!System.IO.File.Exists(filePath))
                return NotFound("El archivo no existe en el servidor");

            var extension = Path.GetExtension(archivo.NombreArchivo).ToLower();

            var contentType = extension switch
            {
                ".pdf" => "application/pdf",
                ".jpg" => "image/jpeg",
                ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                _ => "application/octet-stream"
            };

            var fileBytes = await System.IO.File.ReadAllBytesAsync(filePath);

            return File(fileBytes, contentType, archivo.NombreArchivo);
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