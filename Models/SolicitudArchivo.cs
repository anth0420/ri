

namespace ProyectoPasantiaRI.Server.Models
{
    public class SolicitudArchivo
    {
        public int Id { get; set; }

        public string NombreArchivo { get; set; } = null!;
        public string Ruta { get; set; } = null!;

        public int SolicitudId { get; set; }
        public Solicitud Solicitud { get; set; } = null!;

        public bool EsActual { get; set; } = true;

        public int? SolicitudHistorialId { get; set; }
        public SolicitudHistorial? SolicitudHistorial { get; set; }
    }
}
