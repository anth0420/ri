using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProyectoPasantiaRI.Server.Data;
namespace ProyectoPasantiaRI.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PersonaController : ControllerBase
    {
        private readonly LogsDbContext _context;

        public PersonaController(LogsDbContext context)
        {
            _context = context;
        }
        // Endpoint GET para obtener nombre por cédula
        [HttpGet("por-cedula/{cedula}")]
        public async Task<IActionResult> ObtenerPorCedula(string cedula)
        {
            if (string.IsNullOrWhiteSpace(cedula))
                return BadRequest(new { error = "La cédula es obligatoria." });

            var persona = await _context.Personas
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Cedula == cedula);

            if (persona == null)
                return NotFound(new { mensaje = "No se encontró una solicitud con la cédula proporcionada." });

            return Ok(new
            {
                cedula = persona.Cedula,
                nombre = persona.NombreCompleto
            });
        }
    }
}
