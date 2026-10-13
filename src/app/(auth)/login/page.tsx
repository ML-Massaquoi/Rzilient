import type { Metadata } from "next";
import type { CSSProperties } from "react";
import fs from "node:fs";
import path from "node:path";
import {
  BarChart3Icon,
  MapPinIcon,
  PlaneIcon,
  ShieldCheckIcon,
  UsersIcon,
  WrenchIcon,
} from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

const AIRPORT_PHOTO_EXT = ["jpg", "jpeg", "png", "webp"].find((ext) =>
  fs.existsSync(path.join(process.cwd(), "public", `airport.${ext}`))
);

const FEATURES = [
  {
    icon: ShieldCheckIcon,
    title: "Track Assets",
    sub: "Real-time visibility",
  },
  { icon: UsersIcon, title: "Manage People", sub: "Assign & monitor" },
  {
    icon: WrenchIcon,
    title: "Stay Maintained",
    sub: "Better performance",
  },
  {
    icon: BarChart3Icon,
    title: "See the History",
    sub: "Smarter decisions",
  },
] as const;

export default async function LoginPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const next =
    typeof searchParams.next === "string" ? searchParams.next : undefined;

  return (
    <div
      className="relative min-h-svh w-full overflow-hidden bg-[#F7F5EE] text-[#132A20]"
      style={
        {
          colorScheme: "light",
          "--card": "#FFFFFF",
          "--foreground": "#132A20",
          "--muted-foreground": "#5B6E64",
          "--border": "rgba(19,42,32,0.12)",
          "--input": "rgba(19,42,32,0.18)",
        } as CSSProperties
      }
    >
      {/* Decorative circles — top-right corner */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-40 size-[34rem] rounded-full bg-primary/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 size-[20rem] rounded-full bg-primary/20"
      />
      <div
        aria-hidden
        className="bg-primary pointer-events-none absolute -top-16 -right-16 size-64 rounded-full"
      />

      {/* Decorative waves — bottom-left corner */}
      <svg
        aria-hidden
        viewBox="0 0 900 420"
        preserveAspectRatio="none"
        className="pointer-events-none absolute bottom-0 left-0 h-[34%] w-[62%]"
      >
        <path
          d="M0 420 L0 120 C180 60 360 130 560 190 C720 240 840 280 900 330 L900 420 Z"
          fill="#0E9F5B"
          opacity="0.9"
        />
        <path
          d="M0 420 L0 250 C160 190 320 260 520 310 C680 350 800 380 900 400 L900 420 Z"
          fill="#0B7A46"
        />
      </svg>

      {/* Airport photo — drop public/airport.jpg to enable */}
      {AIRPORT_PHOTO_EXT ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/airport.${AIRPORT_PHOTO_EXT}`}
          alt="Freetown International Airport terminal and aircraft"
          className="pointer-events-none absolute bottom-0 left-[4%] hidden h-[38%] w-[58%] object-cover object-bottom opacity-95 [mask-image:linear-gradient(to_right,black_70%,transparent)] lg:block"
        />
      ) : null}

      <div className="relative z-10 mx-auto grid min-h-svh w-full max-w-[110rem] grid-cols-1 items-center gap-10 px-6 py-10 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16 lg:px-14">
        {/* Brand panel */}
        <div className="hidden flex-col justify-center gap-8 lg:flex">
          <div className="flex items-center gap-4">
            <span className="bg-primary grid size-12 shrink-0 place-items-center rounded-xl text-white">
              <PlaneIcon className="size-6" />
            </span>
            <span className="text-[1.7rem] leading-none font-bold tracking-tight">
              Avci
            </span>
            <span aria-hidden className="bg-[#132A20]/15 h-9 w-px" />
            <span className="text-[#132A20]/60 text-xs font-medium tracking-[0.18em] uppercase">
              Freetown International Airport
            </span>
          </div>

          <div className="space-y-5">
            <span
              aria-hidden
              className="bg-primary block h-1.5 w-12 rounded-full"
            />
            <h1 className="text-[3.4rem] leading-[1.05] font-bold tracking-tight">
              Know what you have.
              <br />
              <span className="text-primary">Know who has it.</span>
            </h1>
            <p className="text-[#132A20]/65 max-w-xl text-lg leading-relaxed">
              A reliable asset management system for Freetown International
              Airport — tracking, maintaining and managing the history of your
              assets.
            </p>
          </div>

          <div className="border-[#132A20]/10 grid max-w-2xl grid-cols-4 divide-x">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex flex-col gap-3 px-5">
                <span className="bg-primary/10 text-primary grid size-11 place-items-center rounded-full">
                  <feature.icon className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-bold">{feature.title}</p>
                  <p className="text-[#132A20]/55 mt-0.5 text-xs">
                    {feature.sub}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sign-in card */}
        <div className="mx-auto flex w-full max-w-md flex-col gap-6 lg:mx-0 lg:ml-auto">
          <div className="flex items-center justify-center gap-3 lg:hidden">
            <span className="bg-primary grid size-10 place-items-center rounded-xl text-white">
              <PlaneIcon className="size-5" />
            </span>
            <span className="text-xl font-bold tracking-tight">Avci</span>
          </div>
          <div className="bg-white rounded-3xl p-8 shadow-[0_24px_60px_-24px_rgba(19,42,32,0.25)] sm:p-10">
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="bg-primary grid size-16 place-items-center rounded-full text-white">
                <PlaneIcon className="size-7" />
              </span>
              <h2 className="text-3xl font-bold tracking-tight">Sign In</h2>
              <p className="text-muted-foreground -mt-2 text-sm">
                Use your Avci account to continue.
              </p>
            </div>

            <div className="mt-8">
              <LoginForm next={next} />
            </div>

            <div className="text-muted-foreground mt-8 flex items-center gap-3 text-xs">
              <span aria-hidden className="bg-border h-px flex-1" />
              <a
                href="mailto:it@fia.sl"
                className="text-primary font-medium underline-offset-4 hover:underline"
              >
                Need help?
              </a>
              <span aria-hidden className="bg-border h-px flex-1" />
            </div>
          </div>
        </div>
      </div>

      {/* Footer — sits on the green wave */}
      <p className="absolute bottom-5 left-10 z-10 hidden items-center gap-2 text-xs font-medium text-white lg:flex">
        <MapPinIcon className="size-3.5" />
        Freetown International Airport
        <span aria-hidden className="opacity-60">
          |
        </span>
        <span className="opacity-90">IT Department</span>
      </p>
    </div>
  );
}
