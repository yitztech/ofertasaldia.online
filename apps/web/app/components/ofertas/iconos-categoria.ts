import {
  BookOpenIcon,
  CarIcon,
  DumbbellIcon,
  Gamepad2Icon,
  HeadphonesIcon,
  HeartPlusIcon,
  HouseIcon,
  LayoutGridIcon,
  MicIcon,
  PawPrintIcon,
  ShirtIcon,
  SparklesIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";
import type { CategoriaId } from "~/datos/tipos";

export const iconoCategoria: Record<CategoriaId, LucideIcon> = {
  todas: LayoutGridIcon,
  electronica: HeadphonesIcon,
  hogar: HouseIcon,
  moda: ShirtIcon,
  belleza: SparklesIcon,
  deportes: DumbbellIcon,
  juguetes: Gamepad2Icon,
  herramientas: WrenchIcon,
  automotriz: CarIcon,
  libros: BookOpenIcon,
  salud: HeartPlusIcon,
  mascotas: PawPrintIcon,
  oficina: MicIcon,
};
