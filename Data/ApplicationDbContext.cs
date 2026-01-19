using Microsoft.EntityFrameworkCore;
using ProyectoPasantiaRI.Server.Models;

namespace ProyectoPasantiaRI.Server.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options) { }
        
        public DbSet<Solicitud> Solicitudes { get; set; }
        public DbSet<SolicitudArchivo> SolicitudArchivos { get; set; }
        public DbSet<SolicitudHistorial> SolicitudHistorials { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Solicitud>()
                .HasMany(s => s.Archivos)
                .WithOne(a => a.Solicitud)
                .HasForeignKey(a => a.SolicitudId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Solicitud>()
                .HasIndex(s => s.NumeroSolicitud)
                .IsUnique();
        }

    }

}
