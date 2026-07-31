import { Menu, MenuButton, MenuItem, MenuItems, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { MoreVertical } from "lucide-react";

export default function Dropdown({ items, buttonClassName = "" }) {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <MenuButton
        className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 ${buttonClassName}`}
      >
        <MoreVertical className="h-4 w-4" />
      </MenuButton>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <MenuItems className="absolute right-0 z-20 mt-1 w-44 origin-top-right rounded-lg border border-slate-200 bg-white p-1 shadow-popover focus:outline-none">
          {items.map((item, idx) => (
            <MenuItem key={idx} disabled={item.disabled}>
              {({ focus }) => (
                <button
                  type="button"
                  onClick={item.onClick}
                  disabled={item.disabled}
                  className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50 ${
                    item.danger ? "text-red-600" : "text-slate-700"
                  } ${focus ? (item.danger ? "bg-red-50" : "bg-slate-100") : ""}`}
                >
                  {item.icon && <item.icon className="h-4 w-4" />}
                  {item.label}
                </button>
              )}
            </MenuItem>
          ))}
        </MenuItems>
      </Transition>
    </Menu>
  );
}
