
namespace ProyectoPasantiaRI.Server.Models
{
    public class SolicitudHistorial
    {
        public int Id { get; set; }

        public int SolicitudId { get; set; }
        public Solicitud Solicitud { get; set; } = null!;

        public DateTime FechaDevolucion { get; set; }

        public string Comentario { get; set; } = null!;

        // Archivos que fueron reemplazados en esta corrección
        public List<SolicitudArchivo> ArchivosReemplazados { get; set; } = new();
    }
}
