using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;
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

    }
}
