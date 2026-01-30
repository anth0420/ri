using System;

namespace ProyectoPasantiaRI.Server.Models
{
    public class Usuario
    {
        public int Id { get; set; }

        public string Nombre { get; set; } = null!;

        public string Correo { get; set; } = null!;

        // Validador | Lector | Administrador
        public string Rol { get; set; } = null!;

        public bool Activo { get; set; }

        public DateTime? UltimoAcceso { get; set; }
    }
}
