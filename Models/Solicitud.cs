using ProyectoPasantiaRI.Server.Enums;

namespace ProyectoPasantiaRI.Server.Models
{
    public class Solicitud
    {
        public int Id { get; set; }

        public string Cedula { get; set; } = null!;
        public string Nombre { get; set; } = null!;
        public string Correo { get; set; } = null!;
        public string NumeroSolicitud { get; private set; }

        public EstadoSolicitud Estado { get; private set; } 

        // Relación 1 a muchos
        public List<SolicitudArchivo> Archivos { get; set; } = new();
        public List<SolicitudHistorial> Historial { get; set; } = new();

        public void AsignarNumeroSolicitud(string numero)
        {
            NumeroSolicitud = numero;
        }
        public void MarcarNueva()
        {
            Estado = EstadoSolicitud.Nueva;
        }
        public void MarcarPendienteRespuesta()
        {
            Estado = EstadoSolicitud.PendienteRespuesta;
        }
        public void MarcarEnRevision()
        {
            Estado = EstadoSolicitud.EnRevision;
        }
        public void MarcarAprobada()
        {
            Estado = EstadoSolicitud.Aprobada;
        }
        public void MarcarRechazada()
        {
            Estado = EstadoSolicitud.Rechazada;
        }
        public void MarcarRespuestaUsuario()
        {
            Estado = EstadoSolicitud.RespuestaUsuario;
        }
    }
}
