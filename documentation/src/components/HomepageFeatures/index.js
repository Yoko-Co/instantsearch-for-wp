import clsx from 'clsx';
import Heading from '@theme/Heading';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: 'Code Tools',
    Svg: require('@site/static/img/undraw_docusaurus_tree.svg').default,
    description: (
      <>
        <p>Shorthands for creating CTPs, Taxonomies, and syncs.</p>
		<Link
			className="button button--secondary button--lg"
      to="/docs/intro">
			View Tools
		</Link>
      </>
    ),
  },
  {
    title: 'Beaver Builder Modules',
    Svg: require('@site/static/img/BB-Vertical-Light.svg').default,
    description: (
      <>
        <p>Custom Beaver Builder modules to deliver tools our clients frequently request.</p>
		<Link
			className="button button--secondary button--lg"
      to="/docs/ai-agent-integrations">
			View Modules
		</Link>
      </>
    ),
  },
  {
    title: 'Super Admin Tools',
    Svg: require('@site/static/img/undraw_docusaurus_react.svg').default,
    description: (
      <>
        <p>Super Admin tools for Clients and Yoko Co team members to help monitor and maintain sites.</p>
		<Link
			className="button button--secondary button--lg"
      to="/docs/sitesearch-filters">
			View Admin Tools
		</Link>
      </>
    ),
  },
];

function Feature({Svg, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
