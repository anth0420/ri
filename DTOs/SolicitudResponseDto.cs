using ProyectoPasantiaRI.Server.Enums;

namespace ProyectoPasantiaRI.Server.DTOs
{
    public class SolicitudResponseDto
    {
        public int Id { get; set; }
        public string NumeroSolicitud { get; set; } = null!;
        public string Cedula { get; set; } = null!;
        public string Nombre { get; set; } = null!;
        public string Correo { get; set; } = null!;

        public int Estado { get;  set; }


        public List<SolicitudArchivoResponseDto> ArchivosActuales { get; set; } = new();
        public List<SolicitudHistorialResponseDto> Historial{ get; set; } = new();
    }
}
