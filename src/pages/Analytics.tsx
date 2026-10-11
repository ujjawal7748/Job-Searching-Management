import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, } from 'recharts'

import { useAuth } from '../auth/authState'
import { useJobData } from '../hooks/useJobs'
import {
    responseRate,
    applicationsThisWeek,
    offerRate,
    applicationsPerWeek,
    funnel,
} from '../lib/stats'

function Analytics() {
    const { session } = useAuth()
    const { data: jobData, isPending: loading, error } = useJobData(session?.user.id ?? '')
    const jobs = jobData?.jobs.filter((job) => !job.deletedAt) ?? []

    if (loading) {
        return <main className="p-4 text-slate-600 sm:p-8">Loading analytics...</main>
    }

    if (error) {
        return <main className="p-4 text-red-600 sm:p-8">{error.message}</main>
    }

    const activeJobs = jobs.filter((job) => job.status !== 'wishlist')
    const wishlist = jobs.filter((job) => job.status === 'wishlist').length
    const interviews = jobs.filter((job) => job.status === 'interview').length
    const offers = jobs.filter((job) => job.status === 'offer').length
    const rejected = jobs.filter((job) => job.status === 'rejected').length

    const stats = [
        { label: 'Total Applied', value: activeJobs.length },
        { label: 'Wishlist', value: wishlist },
        { label: 'Interviews', value: interviews },
        { label: 'Offers', value: offers },
        { label: 'Rejected', value: rejected },
        { label: 'Response Rate', value: `${responseRate(jobs)}%` },
        { label: 'Offer Rate', value: `${offerRate(jobs)}%` },
        { label: 'Applied This Week', value: applicationsThisWeek(jobs) },
    ]

    const weeklyData = applicationsPerWeek(jobs).map((item) => ({
        ...item,
        week: new Date(`${item.week}T00:00:00`).toLocaleDateString(
            'en-IN',
            { day: 'numeric', month: 'short' },
        ),
    }))

    const funnelData = funnel(jobs)
    const funnelColors = ['#64748b', '#3b82f6', '#10b981']

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-8">
            <div className="mx-auto max-w-7xl">
                <h1 className="text-3xl font-bold text-slate-900">
                    Job Analytics
                </h1>
                <p className="mt-2 text-slate-600">
                    Track your applications, interviews, offers, and job search progress.
                </p>

                <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {stats.map((stat) => (
                        <div
                            key={stat.label}
                            className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                        >
                            <p className="text-sm font-medium text-slate-500">
                                {stat.label}
                            </p>
                            <p className="mt-2 text-3xl font-bold text-slate-900">
                                {stat.value}
                            </p>
                        </div>
                    ))}
                </section>

                <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                        <h2 className="mb-5 text-lg font-semibold text-slate-900">
                            Weekly Applications
                        </h2>
                        {weeklyData.length === 0 ? (
                            <p className="py-12 text-center text-slate-500">
                                No application data available yet.
                            </p>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={weeklyData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="week" />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip />
                                    <Bar
                                        dataKey="applications"
                                        name="Applications"
                                        fill="#3b82f6"
                                        radius={[5, 5, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                        <h2 className="mb-5 text-lg font-semibold text-slate-900">
                            Application Funnel
                        </h2>
                        {activeJobs.length === 0 ? (
                            <p className="py-12 text-center text-slate-500">
                                Add applications to see your funnel.
                            </p>
                        ) : (
                            <ResponsiveContainer width="100%" height={240}>
                                <PieChart>
                                    <Pie
                                        data={funnelData.filter((item) => item.count > 0)}
                                        dataKey="count"
                                        nameKey="status"
                                        cx="50%"
                                        cy="45%"
                                        outerRadius="70%"
                                    >
                                        {funnelData
                                            .filter((item) => item.count > 0)
                                            .map((item) => (
                                                <Cell
                                                    key={item.status}
                                                    fill={
                                                        funnelColors[
                                                        funnelData.findIndex(
                                                            (entry) => entry.status === item.status,
                                                        )
                                                        ]
                                                    }
                                                />
                                            ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                        {activeJobs.length > 0 && (
                            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
                                {funnelData
                                    .filter((item) => item.count > 0)
                                    .map((item) => (
                                        <li key={item.status} className="flex items-center gap-2">
                                            <span
                                                aria-hidden="true"
                                                className="h-3 w-3 shrink-0 rounded-sm"
                                                style={{
                                                    backgroundColor:
                                                        funnelColors[
                                                            funnelData.findIndex(
                                                                (entry) => entry.status === item.status,
                                                            )
                                                        ],
                                                }}
                                            />
                                            <span>{item.status}: {item.count}</span>
                                        </li>
                                    ))}
                            </ul>
                        )}
                    </div>
                </section>
            </div>
        </main>
    )
}

export default Analytics