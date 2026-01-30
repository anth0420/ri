using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProyectoPasantiaRI.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddSolicitudHistorial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SolicitudHistorialId",
                table: "SolicitudArchivos",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "SolicitudHistorials",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SolicitudId = table.Column<int>(type: "int", nullable: false),
                    FechaDevolucion = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Comentario = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SolicitudHistorials", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SolicitudHistorials_Solicitudes_SolicitudId",
                        column: x => x.SolicitudId,
                        principalTable: "Solicitudes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SolicitudArchivos_SolicitudHistorialId",
                table: "SolicitudArchivos",
                column: "SolicitudHistorialId");

            migrationBuilder.CreateIndex(
                name: "IX_SolicitudHistorials_SolicitudId",
                table: "SolicitudHistorials",
                column: "SolicitudId");

            migrationBuilder.AddForeignKey(
                name: "FK_SolicitudArchivos_SolicitudHistorials_SolicitudHistorialId",
                table: "SolicitudArchivos",
                column: "SolicitudHistorialId",
                principalTable: "SolicitudHistorials",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SolicitudArchivos_SolicitudHistorials_SolicitudHistorialId",
                table: "SolicitudArchivos");

            migrationBuilder.DropTable(
                name: "SolicitudHistorials");

            migrationBuilder.DropIndex(
                name: "IX_SolicitudArchivos_SolicitudHistorialId",
                table: "SolicitudArchivos");

            migrationBuilder.DropColumn(
                name: "SolicitudHistorialId",
                table: "SolicitudArchivos");
        }
    }
}
