import { useEffect, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend, } from 'recharts'

import type { Job } from '../types/job'
import { getJobs } from '../lib/api'
import {
    responseRate,
    applicationsThisWeek,
    offerRate,
    applicationsPerWeek,
    funnel,
} from '../lib/stats'

function Analytics() {
    const [jobs, setJobs] = useState<Job[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        getJobs()
            .then((data) => setJobs(data.filter((job) => !job.deletedAt)))
            .catch(() => setError('Unable to load job analytics.'))
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return <main className="p-8 text-slate-600">Loading analytics...</main>
    }

    if (error) {
        return <main className="p-8 text-red-600">{error}</main>
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
        <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
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
                            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
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
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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

                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="mb-5 text-lg font-semibold text-slate-900">
                            Application Funnel
                        </h2>
                        {activeJobs.length === 0 ? (
                            <p className="py-12 text-center text-slate-500">
                                Add applications to see your funnel.
                            </p>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={funnelData.filter((item) => item.count > 0)}
                                        dataKey="count"
                                        nameKey="status"
                                        cx="50%"
                                        cy="45%"
                                        outerRadius={90}
                                        label={({ name, value }) =>
                                            `${String(name ?? '')}: ${String(value ?? 0)}`
                                        }
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
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </section>
            </div>
        </main>
    )
}

export default Analytics