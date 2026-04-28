import { ReactNode } from "react";
import {
  CircleUser,
  HelpCircle,
  LogOut,
  Settings as SettingsIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  useToast,
} from "../../primitives";
import { useAppStore } from "../../store";
import { useNavigation } from "../../navigation";

export interface UserMenuProps {
  trigger: ReactNode;
  align?: "start" | "end" | "center";
  side?: "bottom" | "top";
}

export default function UserMenu({ trigger, align = "end", side = "bottom" }: UserMenuProps) {
  const { navigate } = useNavigation();
  const user = useAppStore((s) => s.user);
  const toast = useToast();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side}>
        <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
        <DropdownMenuItem icon={CircleUser} onSelect={() => navigate("settings")}>
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem icon={SettingsIcon} onSelect={() => navigate("settings")}>
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          icon={HelpCircle}
          onSelect={() => toast.info("Help & Support", "Coming soon.")}
        >
          Help & Support
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          icon={LogOut}
          variant="destructive"
          onSelect={() => toast.info("Sign out", "Sign out unavailable in MVP.")}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
