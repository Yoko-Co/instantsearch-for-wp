/**
 * Small dependency-free SVG area chart for analytics time series.
 *
 * @param {Object} props
 * @param {Array}  props.data   Array of { date: 'YYYY-MM-DD', count: number }.
 * @param {number} props.height Chart height in pixels.
 */
import { __ } from '@wordpress/i18n';

const AreaChart = ( { data = [], height = 160 } ) => {
	const width = 600;
	const padding = { top: 10, right: 10, bottom: 24, left: 40 };

	const points = ( data || [] ).filter(
		( d ) => d && typeof d.count === 'number'
	);

	if ( points.length < 2 ) {
		return (
			<div className="instantsearch-admin-v2__chart-empty">
				{ __( 'Not enough data to chart yet.', 'instantsearch-for-wp' ) }
			</div>
		);
	}

	const max = Math.max( ...points.map( ( d ) => d.count ), 1 );
	const innerWidth = width - padding.left - padding.right;
	const innerHeight = height - padding.top - padding.bottom;

	const x = ( i ) => padding.left + ( i / ( points.length - 1 ) ) * innerWidth;
	const y = ( v ) => padding.top + innerHeight - ( v / max ) * innerHeight;

	const linePath = points
		.map( ( d, i ) => `${ i === 0 ? 'M' : 'L' }${ x( i ).toFixed( 1 ) },${ y( d.count ).toFixed( 1 ) }` )
		.join( ' ' );

	const areaPath =
		linePath +
		` L${ x( points.length - 1 ).toFixed( 1 ) },${ ( padding.top + innerHeight ).toFixed( 1 ) }` +
		` L${ x( 0 ).toFixed( 1 ) },${ ( padding.top + innerHeight ).toFixed( 1 ) } Z`;

	const firstDate = points[ 0 ].date;
	const lastDate = points[ points.length - 1 ].date;

	return (
		<svg
			className="instantsearch-admin-v2__chart"
			viewBox={ `0 0 ${ width } ${ height }` }
			role="img"
			aria-label={ __( 'Searches over time', 'instantsearch-for-wp' ) }
		>
			<path d={ areaPath } fill="var(--wp-admin-theme-color, #3858e9)" opacity="0.12" />
			<path d={ linePath } fill="none" stroke="var(--wp-admin-theme-color, #3858e9)" strokeWidth="2" />
			<line
				x1={ padding.left }
				y1={ padding.top + innerHeight }
				x2={ width - padding.right }
				y2={ padding.top + innerHeight }
				stroke="#ddd"
			/>
			<text x={ padding.left } y={ height - 6 } fontSize="11" fill="#757575">
				{ firstDate }
			</text>
			<text x={ width - padding.right } y={ height - 6 } fontSize="11" fill="#757575" textAnchor="end">
				{ lastDate }
			</text>
			<text x={ padding.left - 6 } y={ padding.top + 10 } fontSize="11" fill="#757575" textAnchor="end">
				{ max }
			</text>
			<text
				x={ padding.left - 6 }
				y={ padding.top + innerHeight }
				fontSize="11"
				fill="#757575"
				textAnchor="end"
			>
				0
			</text>
		</svg>
	);
};

export default AreaChart;
