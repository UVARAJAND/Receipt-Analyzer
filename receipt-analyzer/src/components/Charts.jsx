import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from './AppContext';
import '../App.css';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  LineChart, Line, CartesianGrid, ResponsiveContainer
} from 'recharts';
import dayjs from 'dayjs'; // 🟢 Make sure this is installed

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#00C49F'];

function Charts() {
  const { receipts } = useContext(AppContext);
  const [chartType, setChartType] = useState('pie');

  // 📦 Aggregate by category (for pie/bar)
  const chartData = useMemo(() => {
    const categoryMap = {};
    receipts.forEach((doc) => {
      const category = doc.category || 'Uncategorized';
      if (!categoryMap[category]) {
        categoryMap[category] = 0;
      }
      categoryMap[category] += parseFloat(doc.amount);
    });
    return Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
  }, [receipts]);

  // 📆 Aggregate by month (for line)
  const lineChartData = useMemo(() => {
    const monthMap = {};
    receipts.forEach((doc) => {
      const month = dayjs(doc.date).format('MMM YYYY'); // e.g., "Jul 2025"
      if (!monthMap[month]) {
        monthMap[month] = 0;
      }
      monthMap[month] += parseFloat(doc.amount);
    });

    // Optional: sort by month chronologically
    return Object.entries(monthMap)
      .sort((a, b) => dayjs(a[0], 'MMM YYYY').unix() - dayjs(b[0], 'MMM YYYY').unix())
      .map(([name, value]) => ({ name, value }));
  }, [receipts]);

  const [activeIndex, setActiveIndex] = useState(null);
  const handlePieClick = (data, index) => {
    setActiveIndex(index === activeIndex ? null : index); // toggle zoom
  };

  const renderChart = () => {
    if (chartData.length === 0) return <p>No data to display.</p>;

    switch (chartType) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={({ index }) => (index === activeIndex ? 160 : 120)}
                label
                onClick={handlePieClick}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    onClick={() => handlePieClick(entry, index)}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={450}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 40, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                label={{
                  value: 'Category',
                  position: 'insideBottom',
                  offset: -5,
                  style: { fill: 'white' }
                }}
                tick={{ fill: 'white' }}
              />
              <YAxis
                label={{
                  value: 'Amount (₹)',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fill: 'white' }
                }}
                tick={{ fill: 'white' }}
              />
              <Tooltip />
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ paddingTop: 20, color: 'white' }}
              />
              <Bar dataKey="value" fill="#8884d8" name="Amount Spent" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={480}>
            <LineChart
              data={lineChartData}
              margin={{ top: 20, right: 30, left: 40, bottom: 70 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                label={{
                  value: 'Month',
                  position: 'insideBottom',
                  offset: -10,
                  style: { fill: 'white' }
                }}
                tick={{ fill: 'white' }}
              />
              <YAxis
                label={{
                  value: 'Amount (₹)',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fill: 'white' }
                }}
                tick={{ fill: 'white' }}
              />
              <Tooltip />
              <Legend
                verticalAlign="bottom"
                align="center"
                wrapperStyle={{
                  marginTop: 30,
                  color: 'white'
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#82ca9d"
                strokeWidth={3}
                dot={{ r: 5 }}
                activeDot={{ r: 8 }}
                name="Amount Spent"
              />
            </LineChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div className="Charts">
      <div className="visual">
        <div className="chartTypes">
          <button onClick={() => setChartType('pie')}>Pie Chart</button>
          <button onClick={() => setChartType('bar')}>Bar Chart</button>
          <button onClick={() => setChartType('line')}>Line Chart</button>
        </div>
      </div>
      <div className="chartContain">
        {renderChart()}
      </div>
    </div>
  );
}

export default Charts;
