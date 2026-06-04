'use client';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LuPanelRightClose } from "react-icons/lu";
import { LuPanelRightOpen } from "react-icons/lu";
import { useAuth } from "../context/auth_context";
import { CgLogOut } from "react-icons/cg";

const Drawer = ({page, navItems}) => {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname(); 

    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    const { logout, hasPermission } = useAuth()

    // Solo mostramos los módulos para los que el usuario tiene permiso de acceso
    const visibleNavItems = navItems.filter(
        (item) => !item.permission || hasPermission(item.permission)
    );

    return (
        <div className="drawer lg:drawer-open">
            <input id="my-drawer-4" type="checkbox" className="drawer-toggle" checked={isOpen} onChange={(e) => setIsOpen(e.target.checked)} />
            <div className="drawer-content bg-background">
                {/* Navbar */}
                <nav className="navbar w-full bg-surface-container-lowest shadow-sm">
                    <label htmlFor="my-drawer-4" aria-label="open sidebar" className="btn btn-square btn-ghost btn-primary">
                        {/* Sidebar toggle icon */}
                        {isOpen?<LuPanelRightOpen className="text-3xl"/>:<LuPanelRightClose className="text-3xl "/>}
                    </label>
                    <div className="px-4 text-xl font-bold">Sistema de nominas</div>
                </nav>
                    {/* Page content here */}
                <div className="min-w-full p-6">{page}</div>
            </div>

            <div className="drawer-side is-drawer-close:overflow-visible">
                <label htmlFor="my-drawer-4" aria-label="close sidebar" className="drawer-overlay "></label>
                <div className="flex min-h-full flex-col justify-between bg-foreground is-drawer-close:w-16 is-drawer-open:w-64">
                    {/* Sidebar content here */}
                    <div>
                        <ul className="menu w-full grow text-(--inverse-on-surface) flex flex-col gap-2">
                            {/* List item */}
                            {
                                visibleNavItems.map((item, index) => (
                                    <li key={index} className="hover:bg-primary hover:text-on-primary rounded-md">
                                        <Link href={item.href}>
                                            <button className=" is-drawer-close:tooltip is-drawer-close:tooltip-right flex flex-row gap-2 items-center" data-tip={item.dataTip}>
                                                {item.icon}
                                                
                                                <span className="is-drawer-close:hidden">{item.name}</span>
                                            </button>
                                        </Link>
                                    </li>
                                ))
                            }
                        </ul>
                    </div>
                    <button className="is-drawer-close:tooltip is-drawer-close:tooltip-right flex flex-row items-center justify-center gap-2 p-2 hover:bg-error" data-tip={'Cerrar sesión'} onClick={logout}>
                        <CgLogOut className="text-2xl text-background"/>
                        <span className="is-drawer-close:hidden text-background">Cerrar sesión</span>
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Drawer;