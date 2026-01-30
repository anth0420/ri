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
                Correo = dto.Correo,
                FechaCreacion = DateTime.Now
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
            var solicitudes = await _context.Solicitudes
                .Include(s => s.Archivos.Where(a => a.EsActual))
                .Include(s => s.Historial)
                .ToListAsync();

            if (solicitudes == null || !solicitudes.Any())
                return NotFound("No se encontraron Solicitudes");

            var resultado = solicitudes.Select(s => new
            {
                s.Id,
                s.NumeroSolicitud,
                s.Cedula,
                s.Nombre,
                s.Correo,
                Estado = (int)s.Estado,
                s.FechaCreacion,
                FechaDevolucion = s.Historial
                    .OrderByDescending(h => h.FechaDevolucion)
                    .FirstOrDefault()?.FechaDevolucion,
                ArchivosActuales = s.Archivos
                    .Where(a => a.EsActual)
                    .Select(a => new
                    {
                        a.Id,
                        NombreOriginal = a.NombreArchivo,
                        a.EsActual
                    }).ToList()
            }).ToList();

            return Ok(resultado);
        }

        // =====================================
        // OBTENER SOLO SOLICITUDES COMPLETADAS CON CERTIFICACIONES
        // =====================================
        [HttpGet("completadas")]
        public async Task<IActionResult> ObtenerSolicitudesCompletadas()
        {
            var solicitudesCompletadas = await _context.Solicitudes
                .Where(s => s.Estado == EstadoSolicitud.Completada)
                .Include(s => s.Historial)
                .ToListAsync();

            if (!solicitudesCompletadas.Any())
                return Ok(new List<SolicitudConCertificacionesDto>());

            var solicitudesIds = solicitudesCompletadas.Select(s => s.Id).ToList();

            // Obtener todas las certificaciones de estas solicitudes
            var certificaciones = await _context.Certificaciones
                .Where(c => solicitudesIds.Contains(c.SolicitudId))
                .ToListAsync();

            var resultado = solicitudesCompletadas.Select(s => new SolicitudConCertificacionesDto
            {
                Id = s.Id,
                NumeroSolicitud = s.NumeroSolicitud,
                Nombre = s.Nombre,
                Correo = s.Correo,
                Estado = (int)s.Estado,
                FechaCreacion = s.FechaCreacion,
                FechaDevolucion = s.Historial
                    .OrderByDescending(h => h.FechaDevolucion)
                    .FirstOrDefault()?.FechaDevolucion,
                Certificaciones = certificaciones
                    .Where(c => c.SolicitudId == s.Id)
                    .Select(c => new CertificacionResponseDto
                    {
                        Id = c.Id,
                        NombreArchivo = c.NombreArchivo,
                        FechaEnvio = c.FechaEnvio,
                        TipoArchivo = c.TipoArchivo,
                        TamanoBytes = c.TamanoBytes
                    })
                    .OrderByDescending(c => c.FechaEnvio)
                    .ToList()
            }).ToList();

            return Ok(resultado);
        }

        // =====================================
        // OBTENER CERTIFICACIONES DE UNA SOLICITUD ESPECÍFICA
        // =====================================
        [HttpGet("{numeroSolicitud}/certificaciones")]
        public async Task<IActionResult> ObtenerCertificaciones(string numeroSolicitud)
        {
            var solicitud = await _context.Solicitudes
                .FirstOrDefaultAsync(s => s.NumeroSolicitud == numeroSolicitud);

            if (solicitud == null)
                return NotFound("Solicitud no encontrada");

            var certificaciones = await _context.Certificaciones
                .Where(c => c.SolicitudId == solicitud.Id)
                .OrderByDescending(c => c.FechaEnvio)
                .Select(c => new CertificacionResponseDto
                {
                    Id = c.Id,
                    NombreArchivo = c.NombreArchivo,
                    FechaEnvio = c.FechaEnvio,
                    TipoArchivo = c.TipoArchivo,
                    TamanoBytes = c.TamanoBytes
                })
                .ToListAsync();

            return Ok(certificaciones);
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
                    Console.WriteLine($"Error enviando correo: {ex.Message}");
                }
            });

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
            if (string.IsNullOrWhiteSpace(comentario))
            {
                return BadRequest("El comentario es obligatorio");
            }

            if (comentario.Length < 10)
            {
                return BadRequest("El comentario debe tener al menos 10 caracteres");
            }

            if (comentario.Length > 250)
            {
                return BadRequest("El comentario no puede exceder 250 caracteres");
            }

            var solicitud = await _context.Solicitudes
                .Include(s => s.Archivos)
                .FirstOrDefaultAsync(s => s.Id == solicitudId);

            if (solicitud == null)
                return NotFound("Solicitud no encontrada");

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

            _ = Task.Run(async () =>
            {
                try
                {
                    await _emailService.EnviarCorreoDevolucionAsync(solicitud, comentario);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error enviando correo: {ex.Message}");
                }
            });

            return Ok("Solicitud devuelta al usuario");
        }

        // =========================
        // DNMC ENVÍA CERTIFICACIÓN
        // =========================
        [HttpPost("{numeroSolicitud}/responder")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> EnviarCertificacion(
            string numeroSolicitud,
            [FromForm] List<IFormFile> archivos)
        {
            if (archivos == null || archivos.Count == 0)
            {
                return BadRequest("Debe cargar al menos un archivo");
            }

            var extensionesPermitidas = new[] { ".pdf", ".jpg", ".jpeg", ".png" };
            const long maxFileSize = 5 * 1024 * 1024;

            foreach (var archivo in archivos)
            {
                if (archivo.Length == 0)
                {
                    return BadRequest($"El archivo {archivo.FileName} está vacío");
                }

                if (archivo.Length > maxFileSize)
                {
                    return BadRequest($"El archivo {archivo.FileName} excede el tamaño máximo de 5MB");
                }

                var extension = Path.GetExtension(archivo.FileName).ToLower();
                if (!extensionesPermitidas.Contains(extension))
                {
                    return BadRequest($"El archivo {archivo.FileName} tiene un formato no permitido. Solo se aceptan: {string.Join(", ", extensionesPermitidas)}");
                }
            }

            var solicitud = await _context.Solicitudes
                .Include(s => s.Archivos)
                .FirstOrDefaultAsync(s => s.NumeroSolicitud == numeroSolicitud);

            if (solicitud == null)
                return NotFound("Solicitud no encontrada");

            var historial = new SolicitudHistorial
            {
                SolicitudId = solicitud.Id,
                FechaDevolucion = DateTime.Now,
                Comentario = "Certificación enviada por DNMC"
            };

            foreach (var archivo in solicitud.Archivos.Where(a => a.EsActual))
            {
                archivo.EsActual = false;
                archivo.SolicitudHistorial = historial;
            }

            _context.SolicitudHistorials.Add(historial);

            // ✅ Guardar certificaciones en la tabla Certificaciones y obtener sus rutas
            var rutasCertificaciones = await GuardarCertificaciones(archivos, solicitud.Id);

            solicitud.MarcarCompletada();
            await _context.SaveChangesAsync();

            // ✅ CORREGIDO: Enviar correo con certificaciones adjuntas
            _ = Task.Run(async () =>
            {
                try
                {
                    await _emailService.EnviarCorreoCertificacionEnviadaAsync(
                        solicitud,
                        rutasCertificaciones,
                        _env
                    );
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error enviando correo con certificación: {ex.Message}");
                }
            });

            return Ok("Certificación enviada correctamente");
        }

        // =========================
        // DESCARGAR CERTIFICACIÓN
        // =========================
        [HttpGet("certificacion/{certificacionId}")]
        public async Task<IActionResult> DescargarCertificacion(int certificacionId)
        {
            var certificacion = await _context.Certificaciones
                .FirstOrDefaultAsync(c => c.Id == certificacionId);

            if (certificacion == null)
                return NotFound("Certificación no encontrada");

            var uploadsPath = Path.Combine(_env.ContentRootPath, "certificaciones");
            var filePath = Path.Combine(uploadsPath, certificacion.Ruta);

            if (!System.IO.File.Exists(filePath))
                return NotFound("El archivo no existe en el servidor");

            var contentType = certificacion.TipoArchivo switch
            {
                "PDF" => "application/pdf",
                "JPG" => "image/jpeg",
                "JPEG" => "image/jpeg",
                "PNG" => "image/png",
                _ => "application/octet-stream"
            };

            var fileBytes = await System.IO.File.ReadAllBytesAsync(filePath);

            return File(fileBytes, contentType, certificacion.NombreArchivo);
        }

        // =========================
        // DESCARGAR ARCHIVO (LEGACY - Para archivos de solicitud)
        // =========================
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
        [HttpGet("archivo/{archivoId}/ver")]
        public async Task<IActionResult> VerArchivo(int archivoId)
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

            // 👇 CLAVE: NO pasar el nombre del archivo
            return File(fileBytes, contentType);
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

        // =========================
        // GUARDAR CERTIFICACIONES
        // =========================
        private async Task<List<string>> GuardarCertificaciones(
            List<IFormFile> archivos,
            int solicitudId)
        {
            var certificacionesPath = Path.Combine(_env.ContentRootPath, "certificaciones");
            Directory.CreateDirectory(certificacionesPath);

            var rutasGuardadas = new List<string>();

            foreach (var archivo in archivos)
            {
                var nombre = $"{Guid.NewGuid()}_{archivo.FileName}";
                var ruta = Path.Combine(certificacionesPath, nombre);

                using var stream = new FileStream(ruta, FileMode.Create);
                await archivo.CopyToAsync(stream);

                var extension = Path.GetExtension(archivo.FileName).ToLower().TrimStart('.');

                _context.Certificaciones.Add(new Certificacion
                {
                    SolicitudId = solicitudId,
                    NombreArchivo = archivo.FileName,
                    Ruta = nombre,
                    FechaEnvio = DateTime.Now,
                    TipoArchivo = extension.ToUpper(),
                    TamanoBytes = archivo.Length
                });

                // ✅ Guardar solo el nombre del archivo (no la ruta completa)
                rutasGuardadas.Add(nombre);
            }

            await _context.SaveChangesAsync();

            // ✅ Retornar las rutas guardadas para adjuntarlas al correo
            return rutasGuardadas;
        }
    }
}