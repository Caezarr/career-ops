import { ReactNode, useState } from "react";
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
import FeedbackModal from "../shared/FeedbackModal";

export interface UserMenuProps {
  trigger: ReactNode;
  align?: "start" | "end" | "center";
  side?: "bottom" | "top";
}

export default function UserMenu({ trigger, align = "end", side = "bottom" }: UserMenuProps) {
  const { navigate } = useNavigation();
  const user = useAppStore((s) => s.user);
  const setSettingsTab = useAppStore((s) => s.setSettingsTab);
  const toast = useToast();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Profile and Settings used to navigate to the same place — now they
  // diverge. Profile lands on the Account tab (the user wants to edit
  // their profile, not poke at API keys), Settings keeps whatever tab
  // was last active so it feels like resuming rather than reset.
  function goToProfile() {
    setSettingsTab("account");
    navigate("settings");
  }
  function goToSettings() {
    navigate("settings");
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent align={align} side={side}>
          <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
          <DropdownMenuItem icon={CircleUser} onSelect={goToProfile}>
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem icon={SettingsIcon} onSelect={goToSettings}>
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            icon={HelpCircle}
            // Help & Support now opens the beta feedback flow — that is
            // genuinely the most useful thing we can offer at this stage.
            onSelect={() => setFeedbackOpen(true)}
          >
            Help &amp; feedback
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
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  );
}
