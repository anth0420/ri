using System;
using System.ComponentModel.DataAnnotations;

namespace ProyectoPasantiaRI.Server.Models
{
    public class Usuario
    {
        public int Id { get; set; }

        [Required]
        public string Nombre { get; set; } = null!;
        [Required]
        public string Correo { get; set; } = null!;
        [Required]
        // Validador | Lector | Administrador
        public string Rol { get; set; } = null!;

        public bool Activo { get; set; }

        public DateTime? UltimoAcceso { get; set; }
    }
}
