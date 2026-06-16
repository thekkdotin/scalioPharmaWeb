import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Boxes,
  ClipboardList,
  ExternalLink,
  Pill,
  ShieldCheck,
  ShoppingCart,
} from 'lucide-react'

const features = [
  {
    title: 'Inventory control',
    description: 'Track stock, expiry dates, batches, racks, and fast-moving medicines with clean pharmacy workflows.',
    icon: Boxes,
  },
  {
    title: 'Retail billing',
    description: 'Run everyday sales, purchase entries, supplier activity, and counter billing from one place.',
    icon: ShoppingCart,
  },
  {
    title: 'Reports that help',
    description: 'Review sales, purchases, medicine availability, and business performance without spreadsheet noise.',
    icon: BarChart3,
  },
]

const highlights = [
  'Built for retail pharmacy shops',
  'Simple team access and role controls',
  'Medicine finder and rack location support',
  'Clean daily operations dashboard',
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f8faf8] text-gray-950">
      <header className="border-b border-gray-200 bg-white/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
          <a
            href="https://scaliolab.com/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3"
          >
            <img
              src="/scaliolab-logo.png"
              alt="ScalioLab"
              className="h-11 w-11 rounded-lg border border-gray-200 object-cover"
            />
            <div className="leading-tight">
              <p className="text-lg font-bold text-gray-950">ScalioPharma</p>
              <p className="text-xs font-medium text-gray-500">by ScalioLab</p>
            </div>
          </a>

          <div className="flex items-center gap-2">
            <a
              href="https://scaliolab.com/"
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 sm:flex"
            >
              ScalioLab
              <ExternalLink className="h-4 w-4" />
            </a>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-md bg-scalio-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-scalio-800"
            >
              Login
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-16">
          <div className="flex flex-col justify-center">
            <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
              <Pill className="h-4 w-4" />
              Retail pharmacy management
            </div>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight text-gray-950 sm:text-5xl lg:text-6xl">
              ScalioPharma for modern pharmacy shops
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600">
              A practical web application for retail pharmacies to manage medicines, stock, billing, purchases,
              suppliers, reports, and daily store operations with less friction.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-scalio-700 px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-scalio-800"
              >
                Continue to Login
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="https://scaliolab.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-5 py-3 text-base font-semibold text-gray-800 transition hover:bg-gray-50"
              >
                Visit ScalioLab
                <ExternalLink className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div className="relative min-h-[420px] overflow-hidden rounded-lg border border-gray-200 bg-[#0f172a] p-5 shadow-2xl">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-scalio-600 via-emerald-500 to-sky-500" />
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <img
                  src="/scaliolab-logo.png"
                  alt="ScalioPharma"
                  className="h-10 w-10 rounded-md object-cover"
                />
                <div>
                  <p className="font-semibold text-white">ScalioPharma</p>
                  <p className="text-xs text-slate-400">Store dashboard</p>
                </div>
              </div>
              <ShieldCheck className="h-6 w-6 text-emerald-300" />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {[
                ['Today sales', 'Rs. 48,920'],
                ['Stock alerts', '18'],
                ['Purchases', '7 entries'],
                ['Orders', '24 bills'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-white/10 bg-white/8 p-4">
                  <p className="text-xs font-medium text-slate-400">{label}</p>
                  <p className="mt-2 text-xl font-bold text-white">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-md border border-white/10 bg-white p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <ClipboardList className="h-4 w-4 text-scalio-700" />
                  Medicine stock
                </div>
                <span className="rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                  Live
                </span>
              </div>
              <div className="space-y-3">
                {[
                  ['Paracetamol 650', 'Rack A2', 'High'],
                  ['Azithromycin 500', 'Rack C1', 'Medium'],
                  ['Vitamin D3', 'Rack B4', 'Stable'],
                ].map(([name, rack, state]) => (
                  <div key={name} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 text-sm">
                    <span className="font-medium text-gray-800">{name}</span>
                    <span className="text-gray-500">{rack}</span>
                    <span className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">{state}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <article key={feature.title} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                  <Icon className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-bold text-gray-950">{feature.title}</h2>
                <p className="mt-3 text-sm leading-6 text-gray-600">{feature.description}</p>
              </article>
            )
          })}
        </div>

        <div className="mt-10 grid gap-6 rounded-lg border border-gray-200 bg-white p-6 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-scalio-700">Why ScalioPharma</p>
            <h2 className="mt-2 text-2xl font-bold text-gray-950">Generic enough for any retail pharmacy</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {highlights.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-md bg-gray-50 p-3 text-sm font-medium text-gray-700">
                <ShieldCheck className="h-5 w-5 flex-none text-emerald-600" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
