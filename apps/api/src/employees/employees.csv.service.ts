import { Injectable } from "@nestjs/common";
import { parse } from "csv-parse/sync";
import { RolesRepository } from "../roles/roles.repository.js";
import { EmployeesRepository } from "./employees.repository.js";
import { EmployeesService } from "./employees.service.js";

export interface ImportRowError {
  row: number;
  message: string;
}

export interface CreatedAccount {
  email: string;
  temporaryPassword: string;
}

export interface EmployeeImportSummary {
  createdCount: number;
  attachedCount: number;
  errors: ImportRowError[];
}

interface EmployeeCsvRow {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  vendorCode?: string;
  position?: string;
  salary?: number;
  hireDate?: string;
  contractType?: string;
}

// Une cellule CSV vide arrive comme "" (jamais absente) — normalisée en
// `undefined` pour qu'un champ optionnel non renseigné ne devienne pas une
// chaîne vide en base (et surtout pas plusieurs `vendorCode: ""` identiques,
// qui violeraient la contrainte unique par établissement).
function cell(value: string | undefined): string | undefined {
  return value === "" || value === undefined ? undefined : value;
}

function parseRow(
  row: Record<string, string>,
): { data: EmployeeCsvRow } | { error: string } {
  const firstName = row.firstName?.trim();
  const lastName = row.lastName?.trim();
  const email = row.email?.trim();
  const role = row.role?.trim();

  const errors: string[] = [];
  if (!firstName) errors.push("prénom requis");
  if (!lastName) errors.push("nom requis");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.push("email invalide");
  if (!role) errors.push("rôle requis");

  const salaryRaw = cell(row.salary?.trim());
  let salary: number | undefined;
  if (salaryRaw !== undefined) {
    salary = Number(salaryRaw);
    if (Number.isNaN(salary) || salary < 0) errors.push("salaire invalide");
  }

  if (errors.length > 0) return { error: errors.join(", ") };

  return {
    data: {
      firstName: firstName!,
      lastName: lastName!,
      email: email!,
      phone: cell(row.phone?.trim()),
      role: role!,
      vendorCode: cell(row.vendorCode?.trim()),
      position: cell(row.position?.trim()),
      salary,
      hireDate: cell(row.hireDate?.trim()),
      contractType: cell(row.contractType?.trim()),
    },
  };
}

function csvEscape(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

const CSV_HEADERS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "role",
  "vendorCode",
  "position",
  "salary",
  "hireDate",
  "contractType",
  "isActive",
];

@Injectable()
export class EmployeesCsvService {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly employeesRepository: EmployeesRepository,
    private readonly employeesService: EmployeesService,
  ) {}

  // Chaque ligne passe par EmployeesService.create (pas de logique dupliquée)
  // : mêmes règles qu'une création manuelle — mot de passe temporaire
  // uniquement pour un compte réellement nouveau, simple rattachement si
  // l'email existe déjà. Une ligne invalide ne bloque jamais les suivantes.
  async importFromCsv(
    establishmentId: string,
    buffer: Buffer,
  ): Promise<{
    summary: EmployeeImportSummary;
    createdAccounts: CreatedAccount[];
  }> {
    let records: Record<string, string>[];
    try {
      records = parse(buffer.toString("utf-8"), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (err) {
      throw new Error(
        `CSV illisible : ${err instanceof Error ? err.message : "format invalide"}`,
      );
    }

    const roles = await this.rolesRepository.findAll();
    const roleIdByName = new Map(
      roles.map((role) => [role.name.toLowerCase(), role.id]),
    );

    const errors: ImportRowError[] = [];
    const createdAccounts: CreatedAccount[] = [];
    let createdCount = 0;
    let attachedCount = 0;

    for (let i = 0; i < records.length; i++) {
      const rowNumber = i + 2; // ligne 1 = en-tête
      const parsed = parseRow(records[i]);
      if ("error" in parsed) {
        errors.push({ row: rowNumber, message: parsed.error });
        continue;
      }
      const row = parsed.data;
      const roleId = roleIdByName.get(row.role.toLowerCase());
      if (!roleId) {
        errors.push({
          row: rowNumber,
          message: `Rôle "${row.role}" introuvable`,
        });
        continue;
      }

      try {
        const { employee, temporaryPassword } =
          await this.employeesService.create(establishmentId, {
            email: row.email,
            firstName: row.firstName,
            lastName: row.lastName,
            phone: row.phone,
            roleId,
            vendorCode: row.vendorCode,
            position: row.position,
            salary: row.salary,
            hireDate: row.hireDate,
            contractType: row.contractType,
          });
        if (temporaryPassword) {
          createdCount++;
          createdAccounts.push({ email: employee.email, temporaryPassword });
        } else {
          attachedCount++;
        }
      } catch (err) {
        errors.push({
          row: rowNumber,
          message: err instanceof Error ? err.message : "Erreur inattendue",
        });
      }
    }

    return {
      summary: { createdCount, attachedCount, errors },
      createdAccounts,
    };
  }

  async exportToCsv(establishmentId: string): Promise<string> {
    const employees =
      await this.employeesRepository.findAllForEstablishment(establishmentId);
    const lines = [CSV_HEADERS.join(",")];
    for (const e of employees) {
      const row = [
        e.firstName,
        e.lastName,
        e.email,
        e.phone ?? "",
        e.role.name,
        e.vendorCode ?? "",
        e.position ?? "",
        e.salary != null ? String(e.salary) : "",
        e.hireDate ? new Date(e.hireDate).toISOString().slice(0, 10) : "",
        e.contractType ?? "",
        e.isActive ? "oui" : "non",
      ];
      lines.push(row.map((v) => csvEscape(String(v))).join(","));
    }
    return lines.join("\r\n");
  }
}
