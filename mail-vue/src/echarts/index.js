
import * as echarts from 'echarts/core';

import { BarChart,PieChart,LineChart,GaugeChart} from 'echarts/charts';
// Import title, tooltip, grid, dataset and built-in transform components; all component names end with Component
import {
    TooltipComponent,
    GridComponent,
} from 'echarts/components';
// Features such as label auto-layout and global transition animation
// Import the Canvas renderer; importing CanvasRenderer or SVGRenderer is a required step
import { CanvasRenderer } from 'echarts/renderers';
import { LegendComponent } from 'echarts/components';
// Register the required components
echarts.use([
    GaugeChart,
    LegendComponent,
    PieChart,
    TooltipComponent,
    GridComponent,
    BarChart,
    LineChart,
    CanvasRenderer
]);

export default echarts