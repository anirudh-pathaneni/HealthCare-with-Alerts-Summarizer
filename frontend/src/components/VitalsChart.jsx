import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import './VitalsChart.css'

function VitalsChart({ data, type, title, unit, color, gradientId }) {
    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const getGradientColor = () => {
        switch (type) {
            case 'heartRate': return ['#f45c43', '#eb3349']
            case 'spO2': return ['#38ef7d', '#11998e']
            case 'temperature': return ['#f5af19', '#f093fb']
            case 'systolic':
            case 'diastolic': return ['#667eea', '#764ba2']
            case 'respiratory': return ['#00c6ff', '#0072ff']
            default: return ['#667eea', '#764ba2']
        }
    }

    const [colorStart, colorEnd] = getGradientColor()

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="chart-tooltip">
                    <p className="tooltip-time">{formatTime(label)}</p>
                    <p className="tooltip-value">
                        <span className="tooltip-dot" style={{ background: color }}></span>
                        {payload[0].value} {unit}
                    </p>
                </div>
            )
        }
        return null
    }

    return (
        <div className="vitals-chart glass-card">
            <div className="chart-header">
                <h3 className="chart-title">{title}</h3>
                <div className="chart-current">
                    <span className="current-value" style={{ color }}>{data[data.length - 1]?.value || '--'}</span>
                    <span className="current-unit">{unit}</span>
                </div>
            </div>
            <div className="chart-container">
                <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={colorStart} stopOpacity={0.3} />
                                <stop offset="100%" stopColor={colorEnd} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis
                            dataKey="timestamp"
                            tickFormatter={formatTime}
                            stroke="rgba(255,255,255,0.3)"
                            tick={{ fontSize: 11 }}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="rgba(255,255,255,0.3)"
                            tick={{ fontSize: 11 }}
                            axisLine={false}
                            domain={['dataMin - 5', 'dataMax + 5']}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={color}
                            strokeWidth={2}
                            fill={`url(#${gradientId})`}
                            dot={false}
                            activeDot={{ r: 6, fill: color, stroke: '#fff', strokeWidth: 2 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

export default VitalsChart
