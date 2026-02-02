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
        public DbSet<Certificacion> Certificaciones { get; set; }
        public DbSet<Usuario> Usuarios { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Solicitud>()
                .HasMany(s => s.Archivos)
                .WithOne(a => a.Solicitud)
                .HasForeignKey(a => a.SolicitudId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Solicitud>()
                .HasIndex(s => s.NumeroSolicitud)
                .IsUnique();

            modelBuilder.Entity<Solicitud>()
                .Property(s => s.FechaCreacion)
                .HasDefaultValueSql("GETDATE()");

            modelBuilder.Entity<Certificacion>(entity =>
            {
                entity.HasKey(c => c.Id);

                entity.HasOne(c => c.Solicitud)
                    .WithMany()
                    .HasForeignKey(c => c.SolicitudId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(c => c.SolicitudId);

                entity.Property(c => c.NombreArchivo)
                    .IsRequired()
                    .HasMaxLength(500);

                entity.Property(c => c.Ruta)
                    .IsRequired()
                    .HasMaxLength(500);

                entity.Property(c => c.FechaEnvio)
                    .IsRequired();
            });
        }
    }
}
