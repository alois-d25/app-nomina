import Drawer from "@/components/drawer";
import RouteGuard from "@/components/RouteGuard";
import { PERMISSIONS } from "@/app/config/permissions";
import { GoHome } from "react-icons/go";
import { HiOutlinePresentationChartBar } from "react-icons/hi";
import { AiOutlineGift } from "react-icons/ai";
import { TbCurrencyDollarOff } from "react-icons/tb";
import { TfiWallet } from "react-icons/tfi";
import { TbUserShield } from "react-icons/tb";
import { PiGearSix, PiUsersBold } from "react-icons/pi";
import { IoCashOutline } from "react-icons/io5";
import { MdCurrencyExchange, MdOutlineAssignment } from "react-icons/md";

export default async function DashboardLayout({ children }) {

  // `permission: null` => visible para cualquier usuario autenticado.
  const items = [
    {
      name: "Inicio",
      icon: <GoHome className="text-2xl"/>,
      href: "/",
      dataTip: "Inicio",
      permission: null,
    },
    {
      name: "Usuarios",
      icon: <TbUserShield className="text-2xl"/>,
      href: "/users",
      dataTip: "Usuarios",
      permission: PERMISSIONS.USUARIOS_VER,
    },
    {
      name: "Empleados",
      icon: <PiUsersBold className="text-2xl"/>,
      href: "/employees",
      dataTip: "Empleados",
      permission: PERMISSIONS.EMPLEADOS_VER,
    },
    {
      name: "Nominas",
      icon: <IoCashOutline className="text-2xl"/>,
      href: "/nomina",
      dataTip: "Nominas",
      permission: PERMISSIONS.NOMINAS_VER,
    },
    {
      name: "Escala salarial",
      icon: <HiOutlinePresentationChartBar className="text-2xl"/>,
      href: "/salaryRules",
      dataTip: "Escala salarial",
      permission: PERMISSIONS.NOMINAS_VER,
    },
    {
      name: "Bonos",
      icon: <AiOutlineGift className="text-2xl"/>,
      href: "/bonus",
      dataTip: "Bonos",
      permission: PERMISSIONS.NOMINAS_VER,
    },

    {
      name: "Deducciones",
      icon: <TbCurrencyDollarOff className="text-2xl"/>,
      href: "/deductions",
      dataTip: "Deducciones",
      permission: PERMISSIONS.NOMINAS_VER,
    },
    {
      name: "Liquidaciones",
      icon: <TfiWallet className="text-2xl"/>,
      href: "/liquidaciones",
      dataTip: "Liquidaciones",
      permission: PERMISSIONS.NOMINAS_VER,
    },
    {
      name: "Tasa del dolar",
      icon: <MdCurrencyExchange className="text-2xl"/>,
      href: "/exchange",
      dataTip: "Tasa del dolar",
      permission: PERMISSIONS.NOMINAS_EDITAR,
    },
    {
      name: "Registro de uditoria",
      icon: <MdOutlineAssignment className="text-2xl"/>,
      href: "/audits",
      dataTip: "Registro de uditoria",
      permission: PERMISSIONS.ROLES_GESTIONAR,
    },
    {
      name: "Configuración",
      icon: <PiGearSix className="text-2xl"/>,
      href: "/config",
      dataTip: "Configuración",
      permission: PERMISSIONS.ROLES_GESTIONAR,
    },
  ]

  return (

    <div data-theme="school" className="">
      <main>
        <Drawer page={<RouteGuard>{children}</RouteGuard>} navItems={items}/>
      </main>
    </div>
  );
}
