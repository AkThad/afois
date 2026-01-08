import Link from 'next/link'

export default function Nav() {
    return (
        <nav className="border-b border-white/10 bg-background/50 backdrop-blur-md sticky top-0 z-50">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
                <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tighter">
                    <span className="text-blue-500">AFOIS</span>
                    <span className="text-muted-foreground">Intel</span>
                </Link>
                <div className="flex gap-6 text-sm font-medium">
                    <Link href="/" className="transition hover:text-blue-400">War Room</Link>
                    <Link href="/config" className="transition hover:text-blue-400">Configuration</Link>
                </div>
            </div>
        </nav>
    )
}
