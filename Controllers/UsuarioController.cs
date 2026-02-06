using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProyectoPasantiaRI.Server.Data;
using ProyectoPasantiaRI.Server.DTOs;
using ProyectoPasantiaRI.Server.Models;

namespace ProyectoPasantiaRI.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsuariosController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        // Configuración de intentos y bloqueo
        private const int MAX_INTENTOS = 5;
        private const int INTENTOS_ANTES_AVISO = 2; // Los primeros 2 intentos no muestran contador
        private const int MINUTOS_BLOQUEO = 30;

        public UsuariosController(ApplicationDbContext context)
        {
            _context = context;
        }

        /* ===============================
           GET: api/usuarios
           Obtiene todos los usuarios
        =============================== */
        [HttpGet]
        public async Task<IActionResult> ObtenerUsuarios()
        {
            var usuarios = await _context.Usuarios
                .OrderBy(u => u.Nombre)
                .Select(u => new
                {
                    u.Id,
                    u.Nombre,
                    u.Correo,
                    u.Rol,
                    u.Activo,
                    u.UltimoAcceso
                })
                .ToListAsync();

            return Ok(new
            {
                data = usuarios
            });
        }

        /* ===============================
           GET: api/usuarios/{id}
        =============================== */
        [HttpGet("{id:int}")]
        public async Task<IActionResult> ObtenerUsuarioPorId(int id)
        {
            var usuario = await _context.Usuarios
                .Where(u => u.Id == id)
                .Select(u => new
                {
                    u.Id,
                    u.Nombre,
                    u.Correo,
                    u.Rol,
                    u.Activo,
                    u.UltimoAcceso
                })
                .FirstOrDefaultAsync();

            if (usuario == null)
                return NotFound("Usuario no encontrado");

            return Ok(usuario);
        }

        /* ===============================
           POST: api/usuarios
           Crear usuario
        =============================== */
        [HttpPost]
        public async Task<IActionResult> CrearUsuario([FromBody] Usuario usuario)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            bool correoExiste = await _context.Usuarios
                .AnyAsync(u => u.Correo == usuario.Correo);

            if (correoExiste)
                return BadRequest("El correo ya existe");

            usuario.Activo = true;
            usuario.IntentosFallidos = 0;
            usuario.UltimoAcceso = usuario.UltimoAcceso;

            _context.Usuarios.Add(usuario);
            await _context.SaveChangesAsync();

            return CreatedAtAction(
                nameof(ObtenerUsuarioPorId),
                new { id = usuario.Id },
                new
                {
                    usuario.Id,
                    usuario.Nombre,
                    usuario.Correo,
                    usuario.Rol,
                    usuario.Activo,
                    usuario.UltimoAcceso
                }
            );
        }

        /* ===============================
           PUT: api/usuarios/{id}/estado
           Activar / Inactivar
        =============================== */
        [HttpPut("{id:int}/estado")]
        public async Task<IActionResult> CambiarEstadoUsuario(int id)
        {
            var usuario = await _context.Usuarios.FindAsync(id);

            if (usuario == null)
                return NotFound("Usuario no encontrado");

            usuario.Activo = !usuario.Activo;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                usuario.Id,
                usuario.Activo
            });
        }

        /* ===============================
           PUT: api/usuarios/{id}/rol
           Cambiar rol del usuario
        =============================== */
        [HttpPut("{id:int}/rol")]
        public async Task<IActionResult> CambiarRolUsuario(int id, [FromBody] CambiarRolDtos dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Rol))
                return BadRequest("El rol es obligatorio");

            // Roles permitidos
            var rolesPermitidos = new[] { "Validador", "Lector", "Administrador" };

            if (!rolesPermitidos.Contains(dto.Rol))
                return BadRequest("Rol no válido");

            var usuario = await _context.Usuarios.FindAsync(id);

            if (usuario == null)
                return NotFound("Usuario no encontrado");

            usuario.Rol = dto.Rol;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                usuario.Id,
                usuario.Nombre,
                usuario.Correo,
                usuario.Rol
            });
        }

        /* ===============================
           POST: api/usuarios/validar-usuario
           PRE-VALIDACIÓN: Verificar si usuario existe y está activo
        =============================== */
        [HttpPost("validar-usuario")]
        public async Task<IActionResult> ValidarUsuario([FromBody] ValidarUsuarioRequest request)
        {
            try
            {
                var usuario = await _context.Usuarios
                    .FirstOrDefaultAsync(u => u.NombreUsuario == request.Username);

                // 4️⃣ Usuario no registrado
                if (usuario == null)
                {
                    return BadRequest(new
                    {
                        error = "El usuario digitado no se encuentra registrado"
                    });
                }

                // 3️⃣ Usuario inactivo
                if (!usuario.Activo)
                {
                    return BadRequest(new
                    {
                        error = "El usuario digitado se encuentra inactivo"
                    });
                }

                // Verificar si el usuario está bloqueado temporalmente
                if (usuario.BloqueadoHasta.HasValue && usuario.BloqueadoHasta.Value > DateTime.Now)
                {
                    var tiempoRestante = (usuario.BloqueadoHasta.Value - DateTime.Now).Minutes + 1;
                    return BadRequest(new
                    {
                        error = $"Límite de intentos superado. Tu acceso estará restringido durante los próximos {tiempoRestante} minutos."
                    });
                }

                return Ok(new { mensaje = "Usuario válido" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Error en el servidor: " + ex.Message });
            }
        }

        /* ===============================
           POST: api/usuarios/validar-password
           VALIDAR PASSWORD: Manejar intentos fallidos
        =============================== */
        [HttpPost("validar-password")]
        public async Task<IActionResult> ValidarPassword([FromBody] ValidarPasswordRequest request)
        {
            try
            {
                var usuario = await _context.Usuarios
                    .FirstOrDefaultAsync(u => u.NombreUsuario == request.Username);

                if (usuario == null)
                {
                    return BadRequest(new { error = "El usuario digitado no se encuentra registrado" });
                }

                if (!usuario.Activo)
                {
                    return BadRequest(new { error = "El usuario digitado se encuentra inactivo" });
                }

                // Verificar si está bloqueado
                if (usuario.BloqueadoHasta.HasValue && usuario.BloqueadoHasta.Value > DateTime.Now)
                {
                    var tiempoRestante = (usuario.BloqueadoHasta.Value - DateTime.Now).Minutes + 1;
                    return BadRequest(new
                    {
                        error = $"Límite de intentos superado. Tu acceso estará restringido durante los próximos {tiempoRestante} minutos.",
                        bloqueado = true
                    });
                }

                // Si la validación de AD falló (contraseña incorrecta)
                if (!request.AdValido)
                {
                    usuario.IntentosFallidos++;

                    // 2️⃣ Contraseña incorrecta - Manejo de intentos
                    if (usuario.IntentosFallidos >= MAX_INTENTOS)
                    {
                        // Bloquear por 30 minutos
                        usuario.BloqueadoHasta = DateTime.Now.AddMinutes(MINUTOS_BLOQUEO);
                        await _context.SaveChangesAsync();

                        return BadRequest(new
                        {
                            error = $"Límite de intentos superado. Tu acceso estará restringido durante los próximos {MINUTOS_BLOQUEO} minutos.",
                            bloqueado = true
                        });
                    }
                    else if (usuario.IntentosFallidos > INTENTOS_ANTES_AVISO)
                    {
                        // A partir del 3er intento, mostrar intentos restantes
                        int intentosRestantes = MAX_INTENTOS - usuario.IntentosFallidos;
                        await _context.SaveChangesAsync();

                        return BadRequest(new
                        {
                            error = $"Contraseña incorrecta, {intentosRestantes} {(intentosRestantes == 1 ? "intento disponible" : "intentos disponibles")}",
                            intentosRestantes = intentosRestantes
                        });
                    }
                    else
                    {
                        // Primeros 2 intentos: solo indicar contraseña incorrecta
                        await _context.SaveChangesAsync();

                        return BadRequest(new
                        {
                            error = "Contraseña incorrecta, intente de nuevo"
                        });
                    }
                }

                return Ok(new { mensaje = "Contraseña válida" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Error en el servidor: " + ex.Message });
            }
        }

        /* ===============================
           POST: api/usuarios/login
           LOGIN FINAL: Después de validaciones exitosas
        =============================== */
        [HttpPost("login")]
        public async Task<IActionResult> LoginSistema([FromBody] LoginSistemaDto dto)
        {
            try
            {
                var usuario = await _context.Usuarios
                    .FirstOrDefaultAsync(u => u.NombreUsuario == dto.Username);

                if (usuario == null)
                {
                    return BadRequest(new
                    {
                        error = "El usuario digitado no se encuentra registrado"
                    });
                }

                if (!usuario.Activo)
                {
                    return BadRequest(new
                    {
                        error = "El usuario digitado se encuentra inactivo"
                    });
                }

                // Si el bloqueo ha expirado, reiniciar contador
                if (usuario.BloqueadoHasta.HasValue && usuario.BloqueadoHasta.Value <= DateTime.Now)
                {
                    usuario.IntentosFallidos = 0;
                    usuario.BloqueadoHasta = null;
                }

                // ✅ Login exitoso (la validación de AD ya pasó en el frontend)
                usuario.IntentosFallidos = 0;
                usuario.UltimoAcceso = DateTime.Now;
                usuario.BloqueadoHasta = null;
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    usuario.Id,
                    usuario.Nombre,
                    usuario.Rol,
                    username = usuario.NombreUsuario
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Error en el servidor: " + ex.Message });
            }
        }


        [HttpPut("{id:int}/desbloquear")]
        public async Task<IActionResult> DesbloquearUsuario(int id)
        {
            try
            {
                var usuario = await _context.Usuarios.FindAsync(id);

                if (usuario == null)
                    return NotFound(new { error = "Usuario no encontrado" });

                if (!usuario.Activo)
                    return BadRequest(new { error = "No se puede desbloquear un usuario inactivo" });

                // Resetear bloqueo lógico
                usuario.IntentosFallidos = 0;
                usuario.BloqueadoHasta = null;

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    mensaje = "Usuario desbloqueado correctamente",
                    usuario.Id,
                    usuario.Nombre,
                    usuario.NombreUsuario,
                    usuario.IntentosFallidos,
                    usuario.BloqueadoHasta
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    error = "Error en el servidor",
                    detalle = ex.Message
                });
            }
        }
    }


    // DTOs adicionales para las nuevas funcionalidades
    public class ValidarUsuarioRequest
    {
        public string Username { get; set; }
    }

    public class ValidarPasswordRequest
    {
        public string Username { get; set; }
        public bool AdValido { get; set; }
    }
}