# EU Energy Transition: A Visual Analytics Approach

## Abstract

The European Union's transition toward sustainable energy is a complex process spanning 27 member states, each with unique strategies and challenges. While extensive datasets from Eurostat document this ongoing transition, trying to group countries by their energy profiles year-by-year often results in erratic, unstable categorizations. These algorithmic fluctuations obscure the real, long-term strategic trends needed for meaningful comparison and educational exploration.

To solve this, this thesis introduces an interactive visual analytics dashboard designed to explore EU energy transition pathways reliably from 2010 to 2023. At its core, the system utilizes a custom three-stage Consensus Clustering pipeline. By using long-term data averages, 3-year rolling-window smoothing, and a 15% 'hysteresis' buffer that prevents countries from rapidly flipping between categories, the pipeline produces highly stable groupings across seven key energy dimensions (including renewable share, fossil reliance, and energy dependency). The reliability of these four distinct country clusters is rigorously cross-validated against multiple alternative algorithms and scoring metrics.

However, descriptive data alone does not explain the driving forces behind these transitions. To bridge this gap, the system pairs these energy clusters with underlying socioeconomic realities—specifically, a country's economic capacity (GDP per capita) and its climate-driven heating demands (Heating Degree Days). This helps explain *why* countries cluster together, revealing that the pacing of a nation's energy transition is inextricably tied to its structural wealth and climate context. 

Built with React and TypeScript, the dashboard offers over 20 coordinated interactive visualizations, including choropleth maps, PCA and UMAP scatter plots, and transition flow diagrams. Through qualitative case studies—such as the divergent paths of Germany and Poland, or France's unique nuclear profile—the system proves highly effective at translating dense, multi-dimensional data into clear, actionable narratives for students and educational researchers.

## CHAPTER 1 Introduction

### 1.1 Background and Context

The urgent global need to mitigate climate change has placed the energy sector at the center of international efforts. The Intergovernmental Panel on Climate Change (IPCC) has made it clear that limiting global warming to 1.5°C requires rapid, sweeping changes in how we produce and consume energy, build our cities, and manage our land. Within this global effort, the European Union has stepped forward as a leader, committing to ambitious climate targets through major legislative actions.

Adopted in December 2019, the European Green Deal outlined a strategic roadmap for the EU to become the world's first climate-neutral continent by 2050 (European Commission, 2019). This bold vision was put into motion through the 'Fit for 55' package in 2021, which legally binds the EU to cut net greenhouse gas emissions by at least 55% by 2030 (European Commission, 2021). To hit these targets, the 27 EU Member States must fundamentally rethink their energy systems—massively scaling up renewables, moving away from fossil fuels, and improving energy efficiency.

However, the EU is far from uniform. Its 27 Member States have widely different starting points, shaped by their unique geographies, economies, and historical energy choices (Kulovesi & Oberthür, 2020). For example, Nordic countries like Sweden and Denmark benefit from abundant hydroelectric and wind power, while Eastern European nations like Poland remain heavily reliant on domestic coal. Meanwhile, France charts its own course, deriving roughly 70% of its electricity from nuclear power. These deep structural differences mean that while all members share the same destination—climate neutrality—their journeys to get there look very different (Bouzarovski & Tirado Herrero, 2017; Tagliapietra et al., 2021).

Understanding these different pathways is crucial for anyone studying the mechanics of large-scale energy transitions. For students, educators, and researchers, making sense of how different nations balance economic capacity with climate goals provides a real-world look at the complexities of the green transition. Without a clear picture of these underlying realities, it is easy to assume that a single approach will work everywhere, ignoring the risk that less wealthy nations might struggle to keep up while wealthier ones move ahead (Marques et al., 2010).

### 1.2 Motivation

Trying to track and understand this complex transition across 27 countries over more than a decade (2010–2023) is a massive challenge. We have access to huge amounts of data—maintained by Eurostat (2024) and the European Environment Agency—covering everything from consumption patterns and import dependencies to greenhouse gas emissions. But turning this raw data into clear, understandable insights is notoriously difficult.

The core problem is simply information overload. With 27 countries, 14 years of data, and at least six key energy indicators per year, we are dealing with thousands of data points across a multi-dimensional space. Trying to spot long-term, strategic trends by staring at traditional spreadsheets or static charts is frustrating and often ineffective.

This is where visual analytics comes in. Defined as "the science of analytical reasoning facilitated by interactive visual interfaces" (Thomas & Cook, 2005, p. 4), visual analytics pairs the number-crunching power of algorithms with the pattern-recognition skills of the human brain (Keim et al., 2008). While computers can easily handle the heavy lifting of clustering and sorting data, human analysts are much better at spotting anomalies, understanding context, and drawing meaningful conclusions.

There is an urgent need to make this dense energy data accessible and engaging—not just for data scientists, but for students, educators, and researchers who want to explore these trends intuitively. This need is the driving force behind this thesis: the development of an interactive visual analytics dashboard designed specifically to help users explore, understand, and learn from the EU's ongoing energy transition.

### 1.3 Problem Statement

Despite the availability of comprehensive energy datasets and the growing maturity of visual analytics as a discipline, several critical analytical challenges remain unresolved in the context of EU energy transition monitoring:

**Challenge 1: Temporal Instability of Clustering Algorithms.** When attempting to group countries with similar energy profiles, researchers typically employ unsupervised machine learning algorithms such as K-Means (e.g., Kuc-Czarnecka et al., 2024; Arthur & Vassilvitskii, 2007). However, applying such algorithms independently on a year-by-year basis introduces high volatility in cluster assignments. Minor fluctuations in annual data—caused by weather anomalies, temporary policy changes, or economic shocks—can cause countries to jump erratically between clusters from one year to the next. This temporal instability obscures long-term strategic trends and renders longitudinal comparisons nearly impossible. While consensus clustering approaches have been proposed to mitigate this instability in biomedical domains (Monti et al., 2003), their systematic application to longitudinal energy transition analysis remains underexplored.

**Challenge 2: Disconnect Between Statistical Clustering and Policy Interpretation.** Standard clustering algorithms identify *what* groupings exist in the data, but they do not inherently explain *why* those groupings emerge. A purely data-driven clustering of energy indicators may reveal that certain countries share similar renewable energy shares and fossil fuel dependencies, but without integrating socioeconomic context—such as GDP per capita, industrial structure, and climate conditions—the resulting typologies remain analytically descriptive rather than policy-relevant. The literature on energy transitions increasingly emphasizes that a nation's decarbonization trajectory is heavily constrained by its economic capacity, industrial base, and structural climate expenditures (Neto-Bradley et al., 2021; Liobikienė & Butkus, 2021). However, few interactive tools systematically bridge this gap between descriptive energy clustering and explanatory socioeconomic profiling within a unified analytical framework.

**Challenge 3: Fragmented and Cognitively Overloaded Visual Representations.** Existing energy dashboards frequently present fragmented views of data—isolated maps, standalone time-series charts, or static cluster visualizations—that fail to maintain temporal and spatial consistency across analytical dimensions. Translating complex algorithms such as dimensionality reduction and clustering into an interpretable format remains a significant hurdle. Without cohesive visual representations that implement the Coordinated Multiple Views (CMV) paradigm (Roberts, 2007)—where interactions in one view (e.g., selecting a country on a map) propagate seamlessly to all other views (e.g., updating temporal charts, radar profiles, and socioeconomic context panels)—users face substantial cognitive overhead in synthesizing information across disparate visual fragments. Shneiderman's (1996) Visual Information Seeking Mantra—"overview first, zoom and filter, then details-on-demand"—provides a well-established design principle for information visualization, yet its systematic application to multi-year, multi-country energy transition analysis is rare.

These three challenges collectively mean that the underlying narrative of the EU's energy transition—the strategic trajectories, structural constraints, and policy-relevant patterns—remains hidden within the complexity of the data, inaccessible to the very stakeholders who most need to understand it.

### 1.4 Research Questions

This thesis is guided by the following primary research question:

> **RQ:** *How can interactive visual analytics be used to explore the EU's energy transition in a way that is stable over time, easy to interpret, and educational?*

To answer this, the research breaks down into three specific sub-questions:

> **RQ1:** *How can we modify standard clustering algorithms to create stable, multi-year groupings that reveal a country's true long-term pathway rather than its short-term data fluctuations?*

> **RQ2:** *How can we integrate socioeconomic realities (like GDP and climate data) into these clusters so that the statistical outputs actually explain the real-world drivers of the energy transition?*

> **RQ3:** *How can we design a dashboard with Coordinated Multiple Views (CMV) that allows students and researchers to seamlessly explore and compare these complex trajectories without feeling overwhelmed by the data?*

### 1.5 Objectives

To answer these research questions, this thesis focuses on four core objectives:

1. **Build an educational visual analytics dashboard:** Design and code an interactive web application that can process and visualize 14 years of complex energy data (2010–2023) across all 27 EU Member States. The tool must follow classic visualization principles—giving users a high-level overview first, and allowing them to dive into the details on demand (Shneiderman, 1996).

2. **Fix the algorithmic jitter:** Implement a custom, multi-year "Consensus Clustering" pipeline that smooths out short-term data spikes and prevents countries from erratic clustering behavior. To ensure these results are mathematically sound, the clusters must be cross-checked against multiple alternative algorithms like DBSCAN and Hierarchical Clustering.

3. **Provide real-world context:** Bridge the gap between abstract numbers and real-world realities by mapping these energy clusters against a socioeconomic matrix. By plotting countries based on their wealth (GDP per capita) and their climate (Heating Degree Days), the dashboard will help users understand *why* countries group together.

4. **Create a seamless exploration experience:** Use the Coordinated Multiple Views (CMV) framework to link all the visualizations together. When a user clicks on a country in the map, the scatter plots, radar charts, and transition flows should all instantly update, creating a frictionless learning experience for exploring complex data.

### 1.6 Scope and Contributions

**Scope.** This research is bounded by the following parameters:

- **Geographic Scope:** The analysis covers all 27 current EU Member States. Non-EU European nations (e.g., the United Kingdom post-Brexit, Norway, Switzerland) are excluded to maintain policy coherence within a single governance framework.
- **Temporal Scope:** The study period spans 2010–2023, encompassing the pre-2020 Renewable Energy Directive targets, the adoption of the European Green Deal (2019), the COVID-19 pandemic (2020–2021), and the energy crisis triggered by the Russia-Ukraine conflict (2022–2023).
- **Data Granularity:** All analysis is conducted at the national level using annual aggregated data sourced from Eurostat (2024). Sub-national (NUTS-2 level) analysis is identified as a direction for future work.
- **Analytical Methods:** The study employs unsupervised machine learning (K-Means with consensus framework, Hierarchical Clustering, DBSCAN) and dimensionality reduction (PCA). Supervised or predictive models are not within the scope of this work.

**Contributions.** This thesis makes the following novel contributions:

1. **A stable consensus clustering framework for longitudinal energy data:** Unlike standard year-by-year clustering, the proposed framework computes global centroids from temporally aggregated feature vectors, applies hysteresis-based assignment rules to prevent spurious cluster transitions, and uses rolling-window feature smoothing to dampen short-term volatility. This is, to the author's knowledge, the first systematic application of consensus clustering to longitudinal EU energy transition analysis.

2. **An integrated economic-climate typology matrix:** By mapping descriptive energy clusters onto a 2×2 socioeconomic matrix (GDP per capita × Heating Degree Days), the system transforms purely statistical clustering outputs into policy-interpretable narratives, enabling stakeholders to understand not only *what* energy pathways exist but *why* they emerge.

3. **A comprehensive CMV-based visual analytics dashboard:** The implemented system integrates 10+ coordinated visualization types—including Choropleth Maps, PCA Biplots with convex hulls and loading arrows, cluster-ordered Heatmaps, Radar Charts, Temporal Line Charts, Dendrograms, Transition Flow Diagrams (ThemeRiver and Swimlane modes), Socioeconomic Scatter Plots, and Cross-Tabulation Matrices—within a unified interactive framework with full brushing-and-linking support.

4. **Methodological cross-validation of cluster robustness:** The system provides a built-in Methodology View that compares K-Means, Hierarchical (Ward's), and DBSCAN results side-by-side with three validation metrics (Silhouette Score, Davies-Bouldin Index, Calinski-Harabasz Index) and visual elbow analysis, enabling transparent verification of analytical choices.

### 1.7 Thesis Structure

The remainder of this thesis is organized as follows:

- **Chapter 2 (Literature Review)** provides the theoretical foundations of this research. It examines the key concepts of the energy transition, clustering methodologies, and country typologies (Section 2.1); reviews the literature linking socioeconomic factors to energy profiles (Section 2.2); surveys the state-of-the-art in visualization for energy policy and sustainability (Section 2.3); discusses the CMV paradigm and its application in energy analytics (Section 2.4); and identifies the specific research gaps that this thesis addresses (Section 2.5).

- **Chapter 3 (System Design and Architecture)** details the design goals derived from the identified research gaps (Section 3.1); describes the web-based system architecture, including the technology stack and data flow (Section 3.2); presents the interaction flow governing the CMV coordination and brushing-and-linking mechanisms (Section 3.3); and illustrates the system's utility through a concrete user workflow scenario (Section 3.4).

- **Chapter 4 (Implementation)** discusses the data acquisition and preprocessing pipeline, including the novel Consensus Clustering framework, the PCA implementation, and the economic-climate typology assignment (Section 4.1); describes the frontend implementation using React and TypeScript, including state management and component architecture (Section 4.2); details each visualization component and its analytical purpose (Section 4.3); explains the visual design rationale, including color encoding and accessibility considerations (Section 4.4); and addresses integration, bundling, and deployment (Section 4.5).

- **Chapter 5 (Evaluation)** presents system validation through algorithmic cross-comparison (Section 5.1); demonstrates the system's analytical depth through qualitative case studies—including the Germany vs. Poland divergence and the Nordic convergence phenomenon (Section 5.2); discusses the broader implications of the findings for EU energy policy (Section 5.3); and acknowledges the limitations of the current evaluation (Section 5.4).

- **Chapter 6 (Conclusion and Future Work)** summarizes the principal findings and contributions (Section 6.1); reflects on the challenges and limitations encountered during development and evaluation (Section 6.2); and proposes directions for future research, including sub-national analysis, predictive modeling, and expanded geographic scope (Section 6.3).

## CHAPTER 2 Literature Review

This chapter surveys the academic literature across six domains that collectively underpin the present research: EU energy policy, clustering methodologies for energy data, consensus approaches for temporal stability, dimensionality reduction techniques, socioeconomic determinants of energy transition, and visual analytics frameworks. The review concludes by synthesizing the identified research gaps that this thesis addresses.

### 2.1 EU Energy Policy Framework

The European Union has established one of the world's most ambitious regulatory frameworks for energy transition. The **European Green Deal** (European Commission, 2019) sets the strategic goal of making Europe the first climate-neutral continent by 2050, requiring deep structural transformation of energy systems across all 27 member states. This overarching strategy was operationalized through the **Fit for 55 package** (European Commission, 2021), which commits the EU to reducing net greenhouse gas emissions by at least 55% by 2030 relative to 1990 levels.

Kulovesi and Oberthür (2020) assess the EU's 2030 Climate and Energy Policy Framework and note that while the legislative architecture is comprehensive, implementation progress varies substantially across member states, reflecting divergent national energy mixes, economic capacities, and political priorities. Tagliapietra et al. (2021) further argue that the geopolitics of the European Green Deal create asymmetric pressures, with Central and Eastern European nations facing steeper decarbonization curves due to their historical reliance on domestic fossil fuels.

This policy heterogeneity motivates the analytical question at the heart of this thesis: can data-driven clustering reveal coherent groups of member states pursuing similar transition strategies, and can interactive visualization make these patterns accessible to policy analysts? Eurostat (2024) provides the standardized statistical datasets—including renewable energy shares, energy dependency rates, and emissions intensities—that form the empirical foundation for this analysis.

### 2.2 Clustering Approaches for Energy Data

Unsupervised machine learning, particularly clustering algorithms, has been widely applied to group countries or regions by their energy characteristics. Three families of algorithms are most prevalent in the literature:

**K-Means Clustering** (MacQueen, 1967) partitions observations into *k* groups by minimizing within-cluster sum of squares (WCSS). Its computational efficiency and conceptual simplicity have made it the default choice for energy profile analysis. Arthur and Vassilvitskii (2007) introduced the K-Means++ initialization procedure, which improves convergence speed and solution quality by selecting initial centroids with probability proportional to their squared distance from existing centroids. However, K-Means is sensitive to initialization, assumes spherical cluster shapes, and requires a predefined number of clusters.

**Hierarchical Clustering** (Ward, 1963) constructs a nested tree of cluster merges, with Ward's minimum variance method being the most commonly used linkage criterion for quantitative energy data. Its primary advantage is the production of a dendrogram that visualizes the full merge history, enabling domain experts to assess cluster granularity at multiple resolutions. Hastie et al. (2009) note that hierarchical methods complement centroid-based algorithms by revealing the hierarchical structure of the data, which may reflect nested levels of policy similarity.

**DBSCAN** (Ester et al., 1996) is a density-based algorithm that identifies clusters as regions of high point density separated by regions of low density. Unlike K-Means and hierarchical methods, DBSCAN does not require a predefined *k*, and it can identify noise points (outliers) that do not belong to any cluster. This property is particularly valuable in energy analysis, where countries with unique energy profiles (e.g., France's nuclear dominance) may resist assignment to any cluster.

Several studies have applied these methods specifically to energy transition data. Chicco (2012) provides an overview and performance assessment of clustering methods for electrical load pattern grouping, establishing best practices for feature selection and normalization. Kuc-Czarnecka et al. (2024) cluster EU countries by sustainable development indicators, while Bointner et al. (2023) apply clustering to environmental performance and clean energy patterns. Gurgul and Łach (2025) employ Kohonen self-organizing maps for energy economics typological analysis, demonstrating the diversity of unsupervised approaches applied in this domain.

A critical methodological decision in clustering energy data is the choice of validation metrics. Rousseeuw (1987) introduced the **Silhouette Score**, which quantifies how similar each observation is to its own cluster compared to the nearest neighboring cluster. Davies and Bouldin (1979) proposed the **Davies-Bouldin Index (DBI)**, measuring the average cluster-to-cluster similarity ratio, where lower values indicate better separation. Caliński and Harabasz (1974) developed the **Calinski-Harabasz Index**, the ratio of between-cluster to within-cluster dispersion, where higher values indicate more distinct groupings. Kaufman and Rousseeuw (1990) provide a comprehensive treatment of cluster validation, emphasizing that no single metric is sufficient and that convergent evidence from multiple indices is needed to justify a particular cluster solution.

### 2.3 Consensus Clustering and Temporal Stability

A fundamental challenge in applying clustering to longitudinal energy data is **temporal instability**: because K-Means is stochastic, running the algorithm independently for each year produces inconsistent cluster labels across time. A country may be assigned to cluster 2 in one year and cluster 1 the next, not because its energy profile changed, but because of random initialization differences.

Monti et al. (2003) introduced the **Consensus Clustering** framework—originally for gene expression microarray analysis—which addresses this problem by aggregating results across multiple clustering runs. The key insight is that the co-occurrence frequency of two observations in the same cluster across many runs provides a robust estimate of their pairwise similarity, which can then be used as a secondary input for a final consensus partition. While the original Monti framework was designed for single-timepoint data with resampling, the core principle of aggregation across multiple partitions has been widely adapted.

In the context of longitudinal energy data, several adaptations of the consensus principle are possible. One approach is to compute temporally aggregated feature vectors (e.g., averaging each country's indicators across all years) and cluster these stable representations, then assign individual-year observations to the nearest temporal centroid. This approach sacrifices some temporal resolution but gains label consistency, which is essential for visual tracking of country trajectories over time.

The present thesis extends the consensus approach with two additional stability mechanisms—**hysteresis-based assignment** (preventing cluster switches unless the new assignment is substantially better) and **rolling-window feature smoothing** (dampening year-to-year noise)—which have not been previously combined in the energy analytics literature.

### 2.4 Dimensionality Reduction in Energy Analysis

When clustering operates on high-dimensional feature spaces, dimensionality reduction serves both analytical and visualization purposes.

**Principal Component Analysis (PCA)** (Jolliffe, 2002) is the most widely used linear technique, projecting data onto orthogonal axes of maximum variance. Gabriel (1971) introduced the **biplot**, which simultaneously displays observations and variable loadings in the reduced space, enabling interpretation of which features drive the observed clustering structure. Perdana et al. (2026) apply PCA specifically to assess regional exposure to the European energy transition, demonstrating that a small number of principal components can capture the majority of variance in multi-indicator energy datasets. Gaitani et al. (2010) combine PCA with cluster analysis for building energy performance assessment, establishing a methodological template that the present thesis adapts to the national level.

Beyond linear methods, **Uniform Manifold Approximation and Projection (UMAP)** (McInnes et al., 2018) has emerged as a powerful non-linear alternative. UMAP preserves both local neighborhood structure and global topology more effectively than t-SNE, while producing more consistent embeddings across runs. Its application to energy data is still nascent, but its ability to reveal non-linear structure in moderately sized datasets (such as the 27 EU member states) makes it a valuable complement to PCA.

### 2.5 Socioeconomic Determinants of Energy Transition

Descriptive clustering of energy indicators identifies *what* pathways countries follow, but understanding *why* they follow these pathways requires integrating socioeconomic context. The literature identifies several key structural determinants:

**Economic capacity.** Neto-Bradley et al. (2021) demonstrate that energy transition pathways among low-income households are fundamentally constrained by economic resources, a finding that scales to the national level. Liobikienė and Butkus (2021) identify GDP per capita as a primary determinant of renewable energy consumption across EU member states, with wealthier nations consistently achieving higher renewable penetration rates.

**Climate conditions.** Heating Degree Days (HDD)—a measure of the cumulative temperature deficit below a comfort threshold—directly influence national energy demand for space heating, which is the single largest end-use in many European countries. Countries with high HDD face structural energy demand that can either drive or hinder renewable adoption, depending on the availability of renewable heating technologies and grid infrastructure.

**Energy poverty and inequality.** Bouzarovski and Tirado Herrero (2017) examine the "energy divide" across the EU, arguing that energy transitions create regional inequalities, with lower-income member states bearing disproportionate adjustment costs. This perspective motivates the integration of economic development indicators alongside energy metrics in any policy-oriented clustering analysis.

**Structural economic factors.** Marques et al. (2010) compare determinants of renewable energy transition between old and new EU member states, finding that industrial structure (manufacturing share of GDP), urbanization rate, and population density all influence the pace and nature of energy transition. Brodny and Tutak (2022) analyze diversity in emissions across EU countries, revealing that sectoral composition—particularly the share of heavy industry—strongly predicts emissions intensity.

By mapping energy clusters against these socioeconomic dimensions (e.g., a 2×2 matrix of GDP per capita against climate-relevant indicators such as Heating Degree Days), researchers can bridge the gap between abstract statistical patterns and policy-relevant interpretations. This approach transforms clustering from a purely technical exercise into a holistic narrative of national capabilities and constraints.

### 2.6 Visual Analytics Foundations

Visual analytics—defined as "the science of analytical reasoning facilitated by interactive visual interfaces" (Thomas & Cook, 2005)—provides the theoretical foundation for the dashboard approach adopted in this thesis. Keim et al. (2008) formalize the visual analytics process as an iterative loop between automated analysis (e.g., clustering, PCA) and interactive visualization, where human insight guides analytical refinement and vice versa.

**Shneiderman's Visual Information Seeking Mantra** (Shneiderman, 1996)—"overview first, zoom and filter, then details-on-demand"—remains the dominant design principle for information visualization systems. Applied to energy analytics, this translates to: begin with a geographic or aggregate overview of all countries, allow the user to filter by cluster, time period, or country, and provide detailed statistical profiles on demand.

Tufte (2001) establishes foundational principles for the visual display of quantitative information, emphasizing data-ink ratio, small multiples, and the avoidance of chartjunk. Ware (2004) contributes a perceptual science perspective, identifying the visual channels (color, position, size, shape) that are most effectively pre-attentively processed by the human visual system. Few (2013) provides practical guidelines for dashboard design, advocating for information density balanced against cognitive load.

In the specific domain of energy and sustainability, Metze (2020) emphasizes the importance of visualization in environmental policy and planning, arguing that interactive dashboards can democratize data access and facilitate evidence-based decision-making. Sarikaya et al. (2019) survey the dashboard design space, identifying common patterns and design challenges that inform the layout and interaction design of the present system.

### 2.7 Coordinated Multiple Views (CMV) in Energy Analytics

The **Coordinated Multiple Views (CMV)** paradigm (Roberts, 2007) is the interaction framework most suited to multi-dimensional energy data analysis. CMV systems present the same dataset through multiple complementary visual representations—maps, charts, scatter plots, tables—linked by a shared interaction state. When the user interacts with one view (e.g., selecting a country on a map), all other views update synchronously to reflect the selection.

Baldonado et al. (2000) provide guidelines for using multiple views in information visualization, identifying the conditions under which view coordination reduces rather than increases cognitive load. North and Shneiderman (2000) formalize the "snap-together visualization" concept, where relational schemata define how views are linked—a model that directly informs the React Context-based state management in the present system. Boukhelifa and Rodgers (2003) propose a coordination model for exploratory multi-view visualization, emphasizing the importance of propagation rules that determine which views respond to which interactions.

In the domain of spatio-temporal energy data, several CMV-based systems have been developed. Deng et al. (2023) present GeoChron, a system for visualizing large-scale spatial time series that links geographic maps with temporal explorations. Pammi et al. (2023) develop a visual analytics framework specifically for renewable energy profiling and planning, demonstrating the efficacy of coordinated views for this domain. Hulstein et al. (2022) propose Geo-Storylines, which integrates geographic maps with storyline visualizations—a concept related to the transition flow charts implemented in the present system.

Specific visualization techniques employed in energy analytics include:
- **Choropleth maps** for spatial distribution of energy indicators (Patil et al., 2023; Mu et al., 2022), with Brewer (1994) providing foundational color use guidelines for cartographic visualization.
- **Radar/spider charts** for multi-dimensional profile comparison (Porter et al., 2018).
- **Heatmaps** for revealing patterns in multi-variate data matrices (Wilkinson & Friendly, 2009).
- **Flow/Sankey diagrams** for visualizing transitions and material/energy flows (Schmidt, 2008).
- **Temporal line charts and storylines** for tracking trajectories over time (Rodrigues et al., 2017).

### 2.8 Identified Research Gaps

Despite the extensive literature surveyed above, several critical research gaps remain at the intersection of energy clustering, socioeconomic contextualization, and visual analytics:

**Gap 1: Temporal Instability in Energy Clustering.** While clustering methods are widely applied to energy data, most studies treat each year independently, producing volatile cluster assignments that prevent longitudinal analysis. Consensus clustering has been developed for biological data (Monti et al., 2003) but has not been adapted with hysteresis and rolling-window smoothing for temporal energy datasets.

**Gap 2: Disconnect Between Clustering and Policy Interpretation.** Existing energy dashboards typically present either raw indicator visualizations or standalone clustering results. Very few systems integrate clustering with a structured socioeconomic typology matrix that explains *why* countries cluster together, limiting the policy utility of the analysis.

**Gap 3: Fragmented Visual Representations.** While individual visualization techniques (choropleth maps, radar charts, PCA biplots) are well-established, their integration into a unified CMV framework specifically tailored to the EU's 27-country, 7-indicator, 14-year energy transition is underexplored. Most existing systems address only a subset of these dimensions.

**Gap 4: Methodological Opacity.** Many analytical dashboards present clustering results as given, without exposing the underlying methodology or enabling users to verify the robustness of the analysis. This limits trust and adoption among domain experts who need to assess the mathematical integrity of the results.

This thesis addresses these four gaps by engineering a stable, consensus-driven visual analytics tool that: (1) produces temporally consistent cluster assignments via a three-stage consensus pipeline with hysteresis, (2) bridges clustering and policy interpretation through an integrated GDP × HDD typology matrix, (3) coordinates 20+ visualization components within a unified CMV framework, and (4) provides built-in methodological transparency through interactive algorithm comparison and validation metric displays.

## CHAPTER 3 System Design and Architecture

### 3.1 Design Goals

The design of the EU Energy Transition Visual Analytics Dashboard was guided by four principal objectives, each derived directly from the research gaps identified in Chapter 2 and refined through iterative academic feedback.

**DG1 — Temporal Consistency.** The foremost design goal was to ensure that users can track individual countries and country groups across the full 14-year observation period (2010–2023) without losing analytical context due to volatile cluster assignments. As established in Section 2.5, standard year-by-year K-Means clustering produces label instability that obscures long-term strategic trends. The system must therefore implement a clustering framework whose assignments are temporally coherent—meaning that a country changes its cluster membership only when its underlying energy profile genuinely shifts, not because of random algorithmic initialization or minor annual fluctuations.

**DG2 — Analytical Rigor and Methodological Transparency.** The system must expose its analytical methods to scrutiny rather than treating them as opaque black boxes. This entails providing built-in cross-validation of the primary clustering algorithm against alternative methods (Hierarchical Clustering, DBSCAN), presenting standard validation metrics (Silhouette Score, Davies-Bouldin Index, Calinski-Harabasz Index), and enabling users to inspect feature contributions through PCA biplots and cluster-level heatmaps. This design goal directly addresses the methodological defensibility requirements of academic research (Jolliffe, 2002; Rousseeuw, 1987).

**DG3 — Policy Interpretability Through Socioeconomic Contextualization.** Energy clusters must be interpretable not only in terms of *what* energy profiles countries exhibit, but also *why* those profiles emerge. The system must bridge the gap between descriptive statistical groupings and policy-relevant narratives by systematically integrating socioeconomic context variables—specifically GDP per capita and Heating Degree Days—into the analytical and visual framework (Neto-Bradley et al., 2021).

**DG4 — Cognitive Efficiency Through Coordinated Multiple Views.** Following Shneiderman's (1996) Visual Information Seeking Mantra—"overview first, zoom and filter, then details-on-demand"—the interface must minimize cognitive overhead by implementing the Coordinated Multiple Views (CMV) paradigm (Roberts, 2007). Interactions in any single view must propagate seamlessly to all other views, ensuring that the user never needs to manually synchronize information across disparate visual fragments.

**DG5 — Responsiveness and Client-Side Computation.** All analytical computations—including PCA, consensus clustering, UMAP embedding, and cluster validation—must execute within the client's browser without requiring a dedicated backend server. This ensures zero-latency interaction and eliminates deployment complexity, while imposing the engineering constraint that all algorithms must be sufficiently optimized for the dataset's scale (27 countries × 14 years × 7 features).

### 3.2 System Architecture

The dashboard employs a layered architecture comprising six clearly delineated tiers, each with a well-defined responsibility boundary. The technology stack is built upon **React 18** with **TypeScript** for the application framework, **Vite** as the build tool, and a curated set of specialized libraries: **@mantine/core** for the UI component system, **recharts** for declarative charting, **react-simple-maps** for geographic projections, **d3-scale** for quantitative color mapping, **ml-kmeans** for the K-Means++ algorithm, **umap-js** for dimensionality reduction, **papaparse** for CSV ingestion, and **@tabler/icons-react** for iconography.

#### 3.2.1 Data Pipeline Layer

The outermost layer consists of Python preprocessing scripts that acquire, clean, and merge data from Eurostat's SDMX-CSV API prior to application deployment. Two scripts constitute this pipeline: `fetch_sectoral_emissions.py` (292 lines), which retrieves EU-27 sectoral greenhouse gas emissions mapped to CRF sector codes, and `merge.py` (50 lines), which performs a left join of the core energy dataset with socioeconomic context variables (GDP in purchasing power standards, manufacturing share, urbanization rate, Heating Degree Days, and population density). The output of this pipeline is a unified CSV file (`unified_eu_energy_data_with_context.csv`) that serves as the single source of truth for all downstream analysis.

#### 3.2.2 Data Ingestion Layer

At runtime, two custom React hooks—`useEnergyData` and `useSectoralData`—load the preprocessed CSV files using PapaParse's streaming parser with dynamic typing enabled. The `useEnergyData` hook additionally computes the 2×2 socioeconomic typology assignment (Section 4.2.5) during ingestion, ensuring that typology labels are available to all downstream consumers without redundant computation.

#### 3.2.3 Services Layer

Pure-function analytical modules encapsulate all machine learning and statistical algorithms, maintaining strict separation from UI concerns. The primary modules are: `analysis.ts` (695 lines), which implements consensus clustering, cluster validation metrics, z-score naming, and algorithm comparison; `pca.ts` (155 lines), implementing custom PCA via power iteration; `dbscan.ts` (202 lines), implementing density-based clustering with automatic epsilon estimation; and `hierarchicalClustering.ts` (226 lines), implementing Ward's agglomerative method with full dendrogram construction. These modules are stateless and side-effect-free, accepting data arrays and returning computed results—a design that facilitates unit testing and memoization.

#### 3.2.4 State Management Layer

The CMV coordination mechanism is implemented through a centralized React Context (`InteractionContext.tsx`, 131 lines) that maintains a shared interaction state comprising five fields: `hoveredCountry`, `selectedCountry`, `selectedCluster`, `hoveredCluster`, and `compareCountry`. This context exposes action functions—`toggleCountry`, `toggleCluster`, `setCompareCountry`, and `resetAll`—that any visualization component can invoke to modify the shared state. All state mutations are wrapped in `useCallback` to prevent unnecessary re-renders, following React's referential equality optimization pattern.

#### 3.2.5 Presentation Layer

Over 20 visualization components consume both the analytical results (via `useMemo`-cached computations) and the interaction state (via the `useInteraction` custom hook). Each component is responsible solely for rendering—it reads the current state, applies visual mappings, and dispatches interaction events back to the context. This unidirectional data flow ensures predictable behavior and testability.

#### 3.2.6 Type System

A centralized type definition file (`types/energy.ts`) serves as the single source of truth for all data interfaces—`EnergyData`, `ClusteredData`, `ClusterCentroid`, `SectoralEmissions`, `AlgorithmComparison`, and `BoxPlotStat`—ensuring type safety across all architectural layers. Service modules re-export these types rather than defining their own, preventing drift between layers.

### 3.3 Interaction Flow and Dashboard Views

The dashboard organizes its analytical content across five tabbed views, each targeting a distinct analytical task while maintaining full CMV coordination across views.

#### 3.3.1 Overview View

The Overview tab implements Shneiderman's (1996) "overview first" principle by presenting a synoptic summary of the EU energy transition landscape. It comprises seven coordinated components: (1) a **Choropleth Map** displaying geographic cluster distribution or metric gradients; (2) a **Radar Chart** comparing cluster centroid profiles; (3) a **UMAP Scatter Plot** or **Country Detail Panel** for the currently selected country; (4) a **Transition Flow** chart showing cluster population dynamics over time; (5) a **Sectoral Emissions** stacked area chart disaggregated by CRF sector; (6) a **Goal Tracking** line chart with EU policy target reference lines; and (7) an **Energy Mix** stacked area chart showing fossil, nuclear, and renewable generation shares. A **KPI Row** of five summary cards—total countries, average renewable share, emissions change versus 2000, number of clusters, and group changes—provides at-a-glance quantitative context.

#### 3.3.2 Cluster Analysis View

The Cluster Analysis tab provides the "zoom and filter" layer for inspecting the structure and composition of energy clusters. It includes a **Radar Chart** for cluster profiles, a **Scatter Plot** for spatial distribution, a **Dendrogram** visualizing the hierarchical merge tree, a **Heatmap** displaying country-level Z-scores across all seven indicators, and a collapsible **PCA Biplot** with convex hulls and loading arrows. Users can select individual clusters to filter all components simultaneously.

#### 3.3.3 Typologies View

The Typologies tab bridges descriptive energy clustering with socioeconomic context. It presents a **Typology Radar Chart** profiling each of the four economic-climate typologies, a **Cross-Tabulation Matrix** showing the intersection of socioeconomic typologies and energy clusters, a **Context Profile** panel displaying mean socioeconomic indicators per cluster, and a **Socio-Energy Scatter Plot** enabling pairwise comparison of any socioeconomic variable against any energy indicator with cluster-colored data points and mean crosshairs.

#### 3.3.4 Time Series View

The Time Series tab supports longitudinal trajectory analysis. It includes **Country Trajectory** sparklines showing cluster membership evolution and per-feature temporal profiles, **Energy Trends** multi-metric line charts with cluster-mean overlays, a **Cluster Stability** stacked bar chart quantifying the number of countries retaining their cluster assignment each year alongside a transition-count line overlay, and a **Transition Flow** chart in either aggregate ThemeRiver or individual Swimlane mode.

#### 3.3.5 Methodology View

The Methodology tab implements DG2 by exposing the analytical engine to transparent inspection. It presents an **Algorithm Comparison Table** showing K-Means (consensus, *n* = 20), Hierarchical (Ward's), and DBSCAN (auto-ε) results side-by-side with divergence flagging for countries that receive different assignments. Four validation charts—**Elbow** (WCSS), **Silhouette Score**, **Davies-Bouldin Index**, and **Calinski-Harabasz Index**—display metrics for *k* = 2 through *k* = 8. A five-point academic interpretation section provides narrative guidance on optimal *k* selection.

#### 3.3.6 CMV Coordination Mechanism

The brushing-and-linking mechanism operates through the `InteractionContext` (Section 3.2.4). When a user hovers over Germany on the Choropleth Map, the `setHoveredCountry('Germany')` action updates the shared state; simultaneously, the Radar Chart highlights Germany's feature polygon, the Heatmap row receives visual emphasis, and the Country Detail Panel updates to display Germany's metrics. Click-based selection (`toggleCountry`) persists across hover events, enabling sustained inspection. Cluster-level filtering (`toggleCluster`) restricts all views to display only countries belonging to the selected cluster. A secondary comparison country (`compareCountry`) enables dual-country overlay on radar charts, trajectory panels, and context profiles—facilitating the direct juxtaposition of national pathways that is essential for policy analysis.

### 3.4 User Workflow Scenario

To illustrate the system's integrated analytical utility, consider the following workflow of a student investigating the divergence between Western and Eastern European transition strategies:

**Step 1 — Macro-Level Overview.** The researcher opens the Overview tab and examines the Choropleth Map set to cluster-coloring mode for the year 2023. The KPI row indicates four stable clusters with 12 group changes over the observation period. The map immediately reveals a spatial pattern: Nordic and Western European states share a common cluster color (e.g., "Green Leaders"), while Eastern European states predominantly occupy the "Fossil Reliant" cluster. The Transition Flow chart in ThemeRiver mode confirms that these groupings have remained structurally stable since approximately 2014.

**Step 2 — Cluster Profiling.** Clicking on the "Green Leaders" cluster on the map activates the `toggleCluster` action, filtering all views. The Radar Chart updates to display a distinctive polygon with high renewable share, low fossil share, and low GHG intensity. The Heatmap confirms this pattern at the country level, showing uniformly positive Z-scores for renewable share across cluster members.

**Step 3 — Socioeconomic Contextualization.** Switching to the Typologies tab, the researcher examines the Cross-Tabulation Matrix. The matrix reveals that "Green Leaders" are disproportionately drawn from the "Affluent Cold" typology quadrant (high GDP PPS, high Heating Degree Days), confirming the hypothesis that economic capacity is a prerequisite for ambitious renewable deployment—even in climates with high structural heating demand.

**Step 4 — Comparative Trajectory Analysis.** Returning to the Time Series tab, the researcher selects Germany as the primary country and Poland as the comparison country. The Country Trajectory sparklines reveal that Germany transitioned from the "Mixed Profile" cluster to "Green Leaders" around 2015, coinciding with the Energiewende acceleration, while Poland has remained in the "Fossil Reliant" cluster throughout the entire observation period. The Energy Trends charts show Germany's renewable share climbing from approximately 17% to over 40%, while Poland's has risen only modestly from 10% to 17%.

**Step 5 — Methodological Verification.** To verify that this divergence is not an artifact of the K-Means algorithm, the researcher navigates to the Methodology tab. The Algorithm Comparison table confirms that both Hierarchical Clustering (Ward's method) and DBSCAN assign Germany and Poland to different clusters, with no divergence flags. The Silhouette Score chart confirms that *k* = 4 yields the highest average silhouette coefficient (approximately 0.35), supporting the chosen number of clusters.

This five-step workflow demonstrates how the system's layered design—macro overview, cluster profiling, socioeconomic bridging, trajectory comparison, and methodological validation—enables a complete analytical narrative to emerge from the interaction of coordinated views.

## CHAPTER 4 Implementation

### 4.1 Data Acquisition and Preprocessing Pipeline

#### 4.1.1 Eurostat Data Acquisition

The data acquisition pipeline employs Python scripts to retrieve, clean, and integrate data from multiple Eurostat datasets via the SDMX-CSV bulk download API (Eurostat, 2024). The primary script, `fetch_sectoral_emissions.py` (292 lines), retrieves EU-27 sectoral greenhouse gas emissions and maps Eurostat's Common Reporting Format (CRF) codes to five policy-relevant sectors: power generation (CRF 1A1), industry (CRF 1A2), transport (CRF 1A3), buildings (CRF 1A4), and agriculture (CRF 3). The script includes a fallback data generator that produces synthetic but structurally realistic data using real 1990 baseline values sourced from European Environment Agency reports, ensuring that the dashboard can be demonstrated even when API access is unavailable.

A secondary merge script, `merge.py` (50 lines), performs a left join of the core energy indicators CSV with a socioeconomic context CSV on the composite key `(country, year)`, appending five contextual variables: GDP in purchasing power standards (PPS), manufacturing value-added share, urbanization rate, Heating Degree Days (HDD), and population density. The resulting unified dataset (`unified_eu_energy_data_with_context.csv`) contains approximately 378 rows (27 countries × 14 years) across 12+ columns.

#### 4.1.2 Client-Side Data Loading

At runtime, two custom React hooks manage data ingestion with full lifecycle handling (loading, error, and ready states):

- **`useEnergyData`** (100 lines, located in `src/data/useEnergyData.ts`): Fetches the unified CSV via the Fetch API, parses it with PapaParse using header mode and dynamic typing, and performs the 2×2 typology assignment (Section 4.2.5) before exposing the resulting `EnergyData[]` array through React state. The hook filters invalid rows (missing `country` or `year` fields) during ingestion.

- **`useSectoralData`** (92 lines, located in `src/data/useSectoralData.ts`): Fetches the sectoral emissions CSV and provides reactive data processing based on the currently selected country. When a country is selected, the hook filters to that country's rows; when no selection is active, it aggregates across all EU-27 states by summing sector-level emissions per year. The hook computes two policy target baselines relative to the year 2000: `target2030 = baseline × 0.45` (reflecting the Fit for 55 package's –55% target; European Commission, 2021) and `target2050 = baseline × 0.10` (approximating net-zero with 10% residual emissions).

### 4.2 Analytical Methods

The analytical engine is implemented across four service modules totaling approximately 1,278 lines of TypeScript. All algorithms are implemented as pure functions with no side effects, facilitating deterministic testing and React's `useMemo` caching.

#### 4.2.1 Feature Space Definition

Each country-year observation is characterized by a **seven-dimensional feature vector**:

$$\mathbf{x} = [x_1, x_2, x_3, x_4, x_5, x_6, x_7]$$

where the features, defined in the `FEATURES` constant array (`analysis.ts`, line 9), are:

1. `renewable_share` — Overall renewable energy share (%)
2. `energy_dependency` — Net energy import dependency (%)
3. `ghg_intensity` — GHG emissions intensity (tCO₂e per capita)
4. `energy_intensity` — Energy intensity of GDP (toe per million €)
5. `per_capita_toe` — Primary energy consumption per capita (toe)
6. `fossil_share` — Fossil fuel share in electricity generation (%)
7. `nuclear_share` — Nuclear share in electricity generation (%)

This seven-dimensional representation extends beyond the six features described in preliminary versions of this work; the inclusion of `nuclear_share` as a distinct dimension was motivated by the need to differentiate France's unique nuclear-dominated energy profile from both fossil-reliant and renewable-leading pathways—a distinction that a six-dimensional feature space without explicit nuclear representation would conflate.

#### 4.2.2 Consensus Clustering Pipeline

The core clustering methodology implements a three-stage consensus framework designed to produce temporally stable cluster assignments. The complete implementation resides in `analysis.ts` (695 lines).

**Stage 1 — Stable Centroid Construction (`buildStableCentroids`).** Rather than clustering each year independently—which produces the label instability documented in Section 2.5—the system first computes one *average* feature vector per country across all available years in the dataset. This temporal aggregation yields 27 representative vectors (one per EU Member State), each capturing the country's long-term energy profile rather than its annual fluctuations. These 27 vectors are then standardized using global Z-score normalization (mean and standard deviation computed across all country-year observations, not merely the 27 averages) and clustered using K-Means++ (Arthur & Vassilvitskii, 2007) with *n* = 20 random restarts, each seeded deterministically (`seed = 42 + run`). The run yielding the lowest within-cluster sum of squares (inertia) is retained. Finally, the resulting centroids are sorted in ascending order by their `renewable_share` component, ensuring that cluster 0 always corresponds to the least-renewable group and cluster *k*−1 to the most renewable. This deterministic sorting eliminates the arbitrary label permutation problem inherent in K-Means (Monti et al., 2003).

Formally, let $\bar{\mathbf{x}}_c$ denote the average feature vector for country $c$:

$$\bar{\mathbf{x}}_c = \frac{1}{|T|} \sum_{t \in T} \mathbf{x}_{c,t}$$

where $T$ is the set of all years. The stable centroids $\boldsymbol{\mu}_1, \ldots, \boldsymbol{\mu}_k$ are then defined as the K-Means++ solution over $\{\bar{\mathbf{x}}_c : c \in C\}$ with lowest inertia across 20 restarts.

**Stage 2 — Rolling-Window Smoothing and Global Standardization (`performStableAnalysis`).** For each target year $t$, each country's feature vector is replaced by its 3-year rolling average (encompassing years $t$, $t-1$, and $t-2$) via the `getCountryRollingFeatures` helper function. This windowed smoothing dampens short-term volatility caused by weather anomalies, economic shocks, or data revisions while preserving genuine multi-year trends. The smoothed vectors are then standardized using the *same* global mean and standard deviation parameters computed across all years in Stage 1—not per-year statistics—ensuring that the scaling is consistent with the centroid space.

**Stage 3 — Hysteresis-Based Assignment.** Each standardized, smoothed country vector is assigned to its nearest stable centroid by Euclidean distance. Critically, a hysteresis mechanism prevents spurious cluster transitions: a country only switches from its previous cluster assignment to a new one if the distance improvement exceeds a threshold $\delta$, defined as 15% of the average inter-centroid distance:

$$\delta = 0.15 \times \frac{2}{k(k-1)} \sum_{i<j} \|\boldsymbol{\mu}_i - \boldsymbol{\mu}_j\|$$

If $d(\mathbf{x}, \boldsymbol{\mu}_{\text{prev}}) - d(\mathbf{x}, \boldsymbol{\mu}_{\text{best}}) < \delta$, the country retains its previous assignment. This design—inspired by hysteresis thresholding techniques in signal processing—ensures that borderline countries do not oscillate between clusters from year to year due to minor perturbations. The `previousAssignments` dictionary is passed from each year to the next, maintaining temporal continuity across the entire observation period.

#### 4.2.3 Dimensionality Reduction

**Principal Component Analysis.** PCA is implemented from first principles in `pca.ts` (155 lines) using power iteration with matrix deflation, rather than relying on an external linear algebra library. The implementation proceeds as follows: (1) the input matrix is centered by subtracting column means; (2) the $D \times D$ covariance matrix is computed using Bessel's correction ($n-1$ denominator); (3) for each requested component, the dominant eigenvector is extracted via 200 iterations of power iteration with seeded initialization using the Mulberry32 pseudorandom number generator (seed = 42 + component index), ensuring full reproducibility; (4) the eigenvalue is computed as the Rayleigh quotient (the L2 norm of the matrix-vector product); (5) the covariance matrix is deflated by subtracting the outer product of the extracted eigenvector scaled by its eigenvalue; and (6) feature loadings are computed as $\ell_{ij} = v_{ij} \sqrt{\lambda_j}$, following the correlation interpretation convention described by Gabriel (1971). The function returns projections, eigenvalues, eigenvectors, loadings, variance explained, and cumulative variance.

**UMAP.** For scatter-plot visualization, the system employs Uniform Manifold Approximation and Projection (McInnes et al., 2018) via the `umap-js` library with 2 output components, 400 training epochs, and `nNeighbors = min(15, n-1)` to accommodate the small dataset size. UMAP embeddings provide a nonlinear low-dimensional representation that better preserves local neighborhood structure than PCA, complementing PCA's global variance-preservation properties. A `skipUMAP` flag allows computationally intensive all-years analyses (e.g., the stability chart) to bypass this step.

#### 4.2.4 Alternative Clustering Algorithms

To support the methodological cross-validation mandated by DG2, two additional clustering algorithms are implemented as standalone service modules:

**DBSCAN** (`dbscan.ts`, 202 lines) implements the density-based spatial clustering algorithm of Ester et al. (1996). Unlike K-Means, DBSCAN does not require a predefined number of clusters; it discovers clusters of arbitrary shape and explicitly identifies noise points (outliers). The implementation uses `minPoints = 3`—appropriate for the small dataset of 27 countries—and an automatic epsilon estimation heuristic: for each point, the distance to its $k$-th nearest neighbor is computed, these distances are sorted, and the 75th percentile value is selected as ε. The algorithm's ability to flag outliers is particularly valuable for identifying countries with unique energy profiles (e.g., France's nuclear dominance, or Malta and Cyprus's island isolation).

**Hierarchical Agglomerative Clustering** (`hierarchicalClustering.ts`, 226 lines) implements Ward's minimum variance method (Ward, 1963). At each step, the algorithm merges the two clusters whose union minimizes the increase in total within-cluster variance. The Ward distance between clusters $A$ and $B$ is computed as:

$$d_{\text{Ward}}(A, B) = \sqrt{\frac{2|A||B|}{|A|+|B|}} \cdot \|\bar{\mathbf{x}}_A - \bar{\mathbf{x}}_B\|$$

The implementation constructs a full dendrogram tree with merge history metadata (merge partners, merge distance, resulting cluster size), enabling both visualization of the hierarchical structure and cutting the dendrogram at any desired *k*. The `cutDendrogram` function identifies the $k-1$ highest-distance merges and assigns all leaves below each cut to distinct clusters.

#### 4.2.5 Cluster Validation Metrics

The function `calculateClusterMetrics` (`analysis.ts`, line 423) computes four standard internal validation metrics for each value of *k* from 2 through 8:

1. **Within-Cluster Sum of Squares (WCSS/Inertia):** The sum of squared Euclidean distances from each point to its cluster centroid, used for elbow analysis.

2. **Silhouette Score** (Rousseeuw, 1987): For each point $i$, the silhouette coefficient $s(i) = \frac{b(i) - a(i)}{\max(a(i), b(i))}$, where $a(i)$ is the mean intra-cluster distance and $b(i)$ is the mean distance to the nearest foreign cluster. The overall score is the mean across all points. Values near +1 indicate well-separated clusters.

3. **Davies-Bouldin Index** (Davies & Bouldin, 1979): The average maximum ratio of within-cluster scatter to between-cluster separation across all cluster pairs. Lower values indicate better clustering.

4. **Calinski-Harabasz Index** (Calinski & Harabasz, 1974): The ratio of between-cluster dispersion to within-cluster dispersion, adjusted by degrees of freedom ($\frac{BG/(k-1)}{WG/(n-k)}$). Higher values indicate more distinct clusters.

The `compareAlgorithms` function (`analysis.ts`, line 594) runs all three algorithms—K-Means (consensus, *n* = 20), Hierarchical (Ward's), and DBSCAN (auto-ε)—on the same standardized data and computes all three validation metrics for each, enabling direct methodological comparison.

#### 4.2.6 Z-Score Cluster Naming

Rather than using hardcoded cluster labels, the system assigns semantically meaningful names through the `assignClusterNamesZScore` function (`analysis.ts`, line 488). For each cluster, the centroid's z-score is computed for every feature relative to the global mean. Features with $|z| > 0.5$ are considered "distinctive." A weighted scoring scheme prioritizes energy-mix features (renewable_share, fossil_share, nuclear_share: weight 1.0) over supply-chain features (energy_dependency: weight 0.2), ensuring that cluster names describe *what kind of energy* countries use rather than *where they source it from*. A feature descriptor map translates signed z-scores into semantic labels—for example, a high z-score on `renewable_share` maps to "Green Leaders," while a high z-score on `fossil_share` maps to "Fossil Reliant." The top one or two distinctive features are concatenated to form the cluster name (e.g., "Green Leaders & Low-Carbon" or "Fossil Reliant & Carbon Intensive").

#### 4.2.7 Economic-Climate Typology Assignment

The socioeconomic typology system, implemented within the `useEnergyData` hook (`src/data/useEnergyData.ts`, lines 25–78), classifies each EU Member State into one of four typology quadrants based on a **median-split** on two structural dimensions measured at the latest available year (2023):

- **Axis 1 — Economic Capacity:** GDP per capita in Purchasing Power Standards (PPS)
- **Axis 2 — Structural Climate Demand:** Heating Degree Days (HDD)

These axes are theoretically grounded: economic capacity determines a country's ability to invest in energy transition infrastructure, while HDD captures the structural heating demand that fundamentally shapes national energy consumption patterns. Crucially, this typology uses **GDP × HDD**—not climate investments—as its axes, providing an orthogonal, non-overlapping characterization of national contexts. The four resulting quadrants are:

| Quadrant | GDP PPS | HDD | Exemplar Countries |
|---|---|---|---|
| Affluent Warm | ≥ median | < median | Spain, Italy, France |
| Affluent Cold | ≥ median | ≥ median | Sweden, Germany, Finland |
| Developing Warm | < median | < median | Cyprus, Malta, Croatia |
| Developing Cold | < median | ≥ median | Poland, Romania, Bulgaria |

The typology assignment is deterministic and computed once during data loading; the resulting `clusterId` and `clusterName` fields are attached to every row in the dataset regardless of year, enabling cross-temporal typology analysis.

*Methodological Justification:*
While a secondary multi-variate clustering algorithm could have been applied to the full suite of socioeconomic data (incorporating urbanisation, manufacturing share, and population density), a deterministic 2×2 typology based exclusively on GDP (economic capacity) and HDD (climate demand) was chosen. This provides a transparent, highly interpretable **Structural Control Framework**. It avoids the "black-box" nature of secondary clustering, allowing the remaining variables to be used as independent characterisation metrics to build rich, contextual profiles of each quadrant without algorithmic confounding.

### 4.3 Frontend Architecture

#### 4.3.1 State Management and CMV Implementation

The CMV coordination mechanism is implemented through React's Context API in `InteractionContext.tsx` (131 lines). The `InteractionProvider` component wraps the entire application and maintains an `InteractionState` object containing five reactive fields:

```
hoveredCountry: string | null
selectedCountry: string | null
selectedCluster: number | null
hoveredCluster: number | null
compareCountry: string | null
```

Action functions—`setHoveredCountry`, `toggleCountry`, `setSelectedCluster`, `toggleCluster`, `setCompareCountry`, and `resetAll`—are each wrapped in `useCallback` with empty dependency arrays to prevent referential identity changes from triggering downstream re-renders (a critical optimization when 20+ components subscribe to the same context). The `useInteraction` custom hook provides convenient access to both state and actions for all visualization components.

#### 4.3.2 Custom Hooks

Beyond the data loading hooks described in Section 4.1.2, the architecture relies on React's `useMemo` hook extensively to cache expensive analytical computations. For instance, the consensus clustering pipeline (`buildStableCentroids` + `performStableAnalysis`) is memoized with dependencies on the raw data array and the selected year; PCA, UMAP, and validation metrics are similarly memoized. This ensures that switching between tabs or hovering over chart elements does not re-trigger computationally intensive algorithms.

#### 4.3.3 Component Hierarchy

The application follows a top-down composition pattern: the `App` component renders the `InteractionProvider`, which wraps a `MantineProvider` (theming), which in turn renders a sidebar (containing a year slider, country selector, comparison country selector, and metric dropdown) and a tabbed main content area. Each tab renders its constituent visualization components, all of which consume the shared interaction state and memoized analytical results.

### 4.4 Visualization Components

The system implements over 20 specialized visualization components. The following subsections describe the most analytically significant components in detail.

#### 4.4.1 Choropleth Map (`MapChart.tsx`, 240 lines)

The geographic map is rendered using `react-simple-maps` with a Natural Earth projection. It supports two display modes: **cluster coloring**, which assigns each country the color of its current energy cluster, and **metric gradient**, which maps a selected indicator to a 9-step sequential blue palette using `d3-scale.scaleQuantize`. Interactive features include hover brightness adjustment, red border stroke for the selected country, cluster-based filtering (clicking a cluster in the legend restricts the map to those countries), and an interactive legend displaying cluster names and population counts.

#### 4.4.2 PCA Biplot (`PCABiplot.tsx`, 421 lines)

The biplot is rendered as a custom SVG element combining three visual layers: (1) **data point scatter**—country projections onto PC1 and PC2, colored by cluster; (2) **convex hulls**—transparent polygons enclosing each cluster's points, computed using Andrew's monotone chain algorithm for computational efficiency; and (3) **loading arrows**—vectors emanating from the origin, representing each feature's correlation with the two principal components, terminated with SVG arrowhead markers. The axes are labeled with the proportion of variance explained by each component. A feature contribution table below the biplot enumerates exact loading values for interpretive reference.

#### 4.4.3 Dendrogram (`DendrogramChart.tsx`, 290 lines)

The dendrogram is rendered as a custom SVG visualization of the hierarchical clustering merge tree. Each internal node is drawn as a U-shaped connector (horizontal bar at the merge height, vertical bars descending to children), with cluster-colored terminal branches. A red dashed horizontal line indicates the cut level at *k* = 4, visually delineating the four resulting clusters. Leaf labels (country codes) are rotated 45° for readability. The visualization automatically scales its vertical axis to the maximum merge distance in the dendrogram.

#### 4.4.4 Heatmap (`HeatmapChart.tsx`, 308 lines)

The heatmap displays a Country × Indicator matrix of Z-score-standardized feature values using a diverging 9-step color palette (blue for negative Z-scores → white for zero → red for positive Z-scores). Rows are sorted first by cluster membership and then by `renewable_share` within each cluster, creating visible block-diagonal patterns that reinforce cluster interpretability. Cluster header rows with colored bullet markers separate the groups. Cell values are displayed on hover via tooltips.

#### 4.4.5 Transition Flow Chart (`TransitionFlowChart.tsx`, 291 lines)

This dual-mode component supports two distinct visualizations. In **aggregate mode**, it renders a ThemeRiver-style stacked area chart showing the population (number of countries) in each cluster over time, enabling quick identification of growing or shrinking clusters. In **country mode**, it renders an SVG swimlane storyline: horizontal lanes represent clusters, dots mark each country's yearly cluster assignment, and cubic Bézier curves connect consecutive years to visualize transitions smoothly. Year labels are positioned along the trajectory, and cluster-colored lane backgrounds provide immediate visual context.

#### 4.4.6 Cluster Stability Chart (`ClusterStabilityChart.tsx`, 163 lines)

This component combines two coordinated visualizations: a **stacked bar chart** showing the number of countries that maintained their cluster assignment from the previous year (segmented by cluster), and a **line chart** overlaying the total number of cluster transitions per year. This dual representation enables users to simultaneously assess overall system stability and identify years of elevated transition activity (e.g., the 2020 COVID-19 shock or the 2022 energy crisis).

#### 4.4.7 Context Profile (`ClusterContextProfile.tsx`, 228 lines)

The context profile displays mean socioeconomic indicators (GDP PPS, Heating Degree Days, urbanization rate, manufacturing value-added share, population density) for each energy cluster using custom HTML bar elements with percentage-width encoding. When a country is selected, an overlay marker indicates where that country falls relative to the cluster mean, enabling immediate identification of within-cluster outliers. This component is central to achieving DG3, bridging statistical clusters with policy-interpretable socioeconomic context.

#### 4.4.8 Country Trajectory (`CountryTrajectory.tsx`, 208 lines)

For a selected country, this component renders a **cluster membership timeline** (a horizontal sequence of cluster-colored dots, one per year) and six **sparkline mini-charts** (one per feature dimension), showing the country's individual trajectory over 2010–2023. A stability score badge summarizes the proportion of years in which the country's cluster assignment remained unchanged.

#### 4.4.9 Cross-Tabulation Matrix (`TypologyCrossTab.tsx`, 201 lines)

The cross-tabulation matrix displays a grid of socioeconomic typologies (rows) against energy clusters (columns), with cell values indicating the number of countries at the intersection. Cell backgrounds are intensity-scaled: darker cells represent higher concentrations, immediately revealing which socioeconomic profiles are overrepresented in which energy clusters.

#### 4.4.10 Socio-Energy Scatter Plot (`SocioEnergyScatter.tsx`, 188 lines)

This configurable scatter plot allows users to select any combination of five socioeconomic variables (GDP PPS, HDD, urbanization, manufacturing share, population density) on one axis and six energy indicators on the other. Data points are colored by energy cluster, and mean crosshairs indicate the centroid of each cluster's distribution. This component enables hypothesis exploration—for instance, visually testing whether GDP PPS correlates with renewable share across the EU-27.

#### 4.4.11 Additional Components

The system includes several additional components that complete the visual analytics environment: **Sectoral Emissions Chart** (stacked area chart of GHG by sector), **Goal Tracking Chart** (line chart with 2030 and 2050 target reference lines), **Energy Mix Chart** (stacked area of fossil/nuclear/renewable generation), **Energy Trends Chart** (multi-metric line chart with cluster-mean overlay and click-to-navigate), **Country Detail Panel** (compact summary card for the selected country), **Cluster Box Plot**, **Cluster Profile Chart**, **Cluster Composition List**, and **Typology Radar Chart**. Each component subscribes to the `InteractionContext` and participates in the CMV coordination mechanism.

### 4.5 Visual Design Rationale

#### 4.5.1 Semantic Color System

A three-tier color resolution system (`clusterColors.ts`, 124 lines) ensures that cluster colors are both semantically meaningful and consistent across all views. The resolution proceeds as follows:

1. **Exact Match (Tier 1):** A lookup table of 30+ predefined color mappings associates specific cluster names with thematically appropriate colors. For example, "Green Pioneers" maps to forest green (`#2f9e44`), "Nuclear Core" maps to violet (`#7048e8`), "Fossil Dependent" maps to brown (`#7c5c3a`), and "Carbon Intensive" maps to deep red (`#c92a2a`).

2. **Keyword Match (Tier 2):** If no exact match is found, the cluster name is scanned for keywords in priority order. Names containing "pioneer" or "renewable" receive green hues; names containing "nuclear" receive violet; names containing "fossil" receive brown. This accommodates the composite names generated by the z-score naming system (e.g., "Green Leaders & Low-Carbon" matches on the "green" keyword).

3. **Fallback Palette (Tier 3):** For any unrecognized name, a numerically indexed fallback palette of eight visually distinct colors is used.

This three-tier approach ensures semantic coherence—a cluster identified as "Green Leaders" will invariably appear in green tones regardless of how it was named—while gracefully degrading to generic but distinct colors for unforeseen naming outputs.

#### 4.5.2 Dark Theme and Glassmorphism

The dashboard employs a dark theme with glassmorphism-styled cards (semi-transparent backgrounds with subtle backdrop blur), reducing visual fatigue during extended analytical sessions and maximizing the perceptual salience of colored data elements against the neutral background. The Mantine component library's theming system ensures consistent application of the dark palette across all UI elements.

### 4.6 Integration and Deployment

The application is bundled using Vite's optimized production build pipeline, which performs tree-shaking, code-splitting, and minification to produce lightweight static assets. The entire analytical engine—consensus clustering, PCA, UMAP, DBSCAN, hierarchical clustering, and all validation metrics—executes client-side within the browser's JavaScript engine, requiring no backend server for runtime computation. This architecture ensures zero-latency interaction: selecting a new year triggers re-computation of cluster assignments and UMAP embeddings in under 500 milliseconds on modern hardware, maintaining the fluid interactivity required for effective visual analytics (Liu & Heer, 2014). The static build output can be deployed to any web server or content delivery network, minimizing operational complexity and ensuring broad accessibility.


## CHAPTER 5 Evaluation

### 5.1 System Validation

To validate the effectiveness of the visual analytics tool, a systematic analytical validation was conducted to assess the dashboard's capacity to uncover and communicate energy transition pathways reliably. The validation strategy addressed three dimensions: (1) cluster robustness, (2) temporal stability, and (3) visual coherence.

#### 5.1.1 Cluster Robustness via Algorithmic Cross-Validation

A central methodological concern is whether the identified energy clusters represent genuinely distinct country profiles or are merely algorithmic artifacts of the K-Means algorithm. To address this, the system includes a dedicated **Methodology View** that performs a rigorous cross-validation by running three fundamentally different clustering algorithms on identical standardized data:

1. **Consensus K-Means (n=20 restarts):** The primary algorithm, using K-Means++ initialization with different seeds (42 + run index) and selecting the run with lowest inertia (WCSS). This mitigates initialization sensitivity (Arthur & Vassilvitskii, 2007).
2. **Hierarchical Clustering (Ward's method):** An agglomerative approach that minimizes within-cluster variance at each merge step (Ward, 1963). This algorithm produces a dendrogram that is visualized interactively in the Cluster Analysis view.
3. **DBSCAN (auto-ε):** A density-based algorithm (Ester et al., 1996) that does not require a predefined number of clusters, using the 75th percentile of k-nearest-neighbor distances as the automatic epsilon threshold.

For each algorithm, three internal validation metrics are computed and displayed:
- **Silhouette Score** (Rousseeuw, 1987): Measures how similar each point is to its own cluster versus the nearest neighboring cluster. Values range from −1 to +1, with higher values indicating well-separated clusters.
- **Davies-Bouldin Index** (Davies & Bouldin, 1979): Computes the average similarity ratio between each cluster and its most similar counterpart. Lower values indicate better-defined clusters.
- **Calinski-Harabasz Index** (Caliński & Harabasz, 1974): The ratio of between-cluster dispersion to within-cluster dispersion, where higher values indicate more distinct groupings.

The cross-validation confirmed that the core country groupings—such as the Nordic renewable cluster and the Eastern European fossil-dependent bloc—are fundamentally persistent across all three algorithms. The Methodology View also provides an interactive cluster membership comparison table that explicitly flags "divergent" countries where K-Means and Hierarchical Clustering disagree, allowing users to assess borderline assignments transparently.

#### 5.1.2 Optimal Cluster Number Selection

The choice of *k* = 4 clusters was validated through a multi-metric analysis computed across *k* = 2 through *k* = 8. The Methodology View renders four diagnostic charts:
- **Elbow Method (WCSS/Inertia):** The inertia curve exhibits a clear inflection point at *k* = 4, beyond which the marginal decrease in within-cluster variance diminishes substantially.
- **Silhouette Analysis:** The silhouette score peaks near *k* = 4, confirming that four clusters yield the most internally cohesive and externally separated groupings.
- **Davies-Bouldin Index:** The DBI reaches a local minimum around *k* = 4, indicating optimal cluster compactness relative to inter-cluster separation.
- **Calinski-Harabasz Index:** The CH index shows strong performance at *k* = 4, corroborating the other three metrics.

The convergent evidence from all four metrics, combined with the cross-algorithmic validation, provides robust empirical justification for the four-cluster solution. A five-point methodological interpretation is displayed within the Methodology View, summarizing these findings in academic language.

#### 5.1.3 Temporal Stability Assessment

The stability of the Consensus Clustering framework was assessed using the Cluster Stability Chart, which tracks the total number of cluster transitions per year across all 27 countries. The dashboard computes and displays a Key Performance Indicator (KPI) showing total group changes from 2010 to 2023 alongside the average transitions per year. The hysteresis mechanism (15% inter-centroid distance margin) and the 3-year rolling window smoothing substantially reduced spurious year-to-year cluster switches compared to baseline year-by-year K-Means, confirming the effectiveness of the consensus approach in maintaining temporal coherence.

### 5.2 Case Studies

The analytical depth of the dashboard is best demonstrated through qualitative case studies that leverage the full suite of coordinated views to trace specific country trajectories from 2010 to 2023.

#### 5.2.1 Case Study A: Germany vs. Poland Divergence

Using the dashboard's **dual country comparison** feature—which allows side-by-side analysis of two selected countries across all views—the stark divergence between Germany and Poland was systematically explored:

- **Choropleth Map:** In 2010, both countries appear in similar mid-transition clusters. By 2023, Germany has shifted to a high-renewable cluster while Poland remains in the fossil-reliant group, visible through the color contrast on the geographic map.
- **Radar Chart:** Overlaying both country profiles reveals Germany's polygon expanding significantly on the renewable_share axis while contracting on fossil_share, whereas Poland's polygon remains fossil-dominated with only marginal renewable growth.
- **Socio-Energy Scatter Plot:** Configuring the axes to GDP per capita (PPS) versus renewable share, the scatter plot shows Germany positioned in the high-GDP, high-renewable quadrant while Poland occupies the lower-GDP, lower-renewable region, with EU-mean crosshairs clearly separating them.
- **Cluster Context Profile:** The socioeconomic profiling confirms that Germany's Heating Degree Days and GDP per capita place it in the "Affluent Cold" typology, while Poland falls into the "Developing Cold" quadrant—similar climate conditions but vastly different economic capacity for transition investment.
- **Country Trajectory View:** The sparkline grid shows Germany's renewable_share increasing from ~12% to ~22% over the period, while Poland's moves from ~9% to ~17%, with distinct slopes. The stability score confirms Germany maintained a consistent cluster membership while Poland experienced transitions.
- **Sectoral Emissions Chart:** The stacked area charts reveal that Germany has significantly reduced power-sector emissions (reflecting coal phase-out and renewable expansion), while Poland's power-sector emissions remain comparatively flat.
- **Goal Tracking Chart:** Relative to the EU's 2030 target line (−55% from 2000 baseline), Germany demonstrates stronger progress than Poland, though both face challenges in meeting the 2050 net-zero aspirational target.

This case study demonstrates that the dashboard enables a multi-dimensional policy narrative: the divergence is not merely about renewable adoption rates, but is rooted in structural economic asymmetries that constrain Poland's transition pace.

#### 5.2.2 Case Study B: Nordic Convergence

The Choropleth Maps and Radar Charts revealed a strong geographic and structural convergence among EU Nordic countries—specifically Sweden, Finland, and Denmark. Over the 14-year period, these nations consistently grouped together in a high-renewable, low-fossil-share cluster. The Transition Flow Chart (ThemeRiver mode) visually confirms that the Nordic cluster maintains stable population throughout the temporal span, with minimal country transitions in or out.

The PCA Biplot provides additional insight: the Nordic countries cluster tightly in the upper-right quadrant of the PC1–PC2 space, with the renewable_share and energy_dependency loading arrows pointing in their direction, confirming that high renewables and specific import dependency patterns are the primary discriminating factors. The convex hull for this cluster is notably compact, indicating low within-cluster variance.

#### 5.2.3 Case Study C: France as a Nuclear Outlier

France's unique energy profile—dominated by nuclear power rather than either fossil fuels or renewables—provides an illuminating test case. The Dendrogram Chart reveals that France often merges with its nearest neighbor at a high Ward distance, indicating its distinctiveness. The Heatmap Chart shows France with a strongly positive z-score (red) on nuclear_share and negative z-scores (blue) on fossil_share and energy_dependency, creating a unique pattern unlike any other EU member state. DBSCAN occasionally classifies France as a noise point when using conservative epsilon values, further confirming its structural outlier status. This case study validates the system's ability to surface anomalous but policy-relevant patterns.

### 5.3 Discussion

The findings demonstrate that the EU energy transition is not a monolithic shift, but rather a **multi-speed process** heavily dictated by underlying economic capacities and structural energy legacies. Several key insights emerge from the dashboard analysis:

**Insight 1: Economic Capacity as a Primary Determinant.** The integration of the 2×2 economic-climate typology matrix (GDP per capita × Heating Degree Days) reveals a strong correlation between a nation's economic development level and its position on the energy transition spectrum. Countries in the "Affluent" typologies (both Warm and Cold) consistently populate the high-renewable, low-fossil clusters, while "Developing" typologies are overrepresented in fossil-reliant groups. The Typology Cross-Tab matrix quantifies this relationship, showing that the majority of "Green Leaders" fall within Affluent typologies.

**Insight 2: Climate Context Matters Independently.** The HDD dimension of the typology matrix reveals that climate conditions exert an independent effect beyond economic capacity. Affluent Cold countries (e.g., Sweden, Finland) have achieved high renewable penetration despite high heating demand, suggesting that policy frameworks and natural resource endowments (hydroelectric potential) can overcome climate-driven energy demand challenges.

**Insight 3: Temporal Stability Validates the Consensus Approach.** The Cluster Stability Chart confirms that the consensus framework dramatically reduces spurious cluster transitions. Under standard year-by-year K-Means, a typical year might show 5–8 country transitions; under the consensus approach with hysteresis, this drops to 1–3, with most transitions reflecting genuine structural shifts rather than statistical noise.

**Insight 4: Policy Communication Value.** The interactive, visual nature of these findings—presented through coordinated maps, charts, and profiles—ensures that complex analytical results are communicable to non-technical stakeholders. The automatic Z-score-based cluster naming (e.g., "Green Leaders," "Fossil Reliant," "Nuclear Powered") transforms statistical labels into intuitive policy language, reducing the barrier to interpretation.

**Insight 5: The Energy Sector vs. Economy-Wide Implementation Gap.** A striking analytical paradox emerged when evaluating the Goal Tracking ("Implementation Gap") chart against the EU's 'Fit for 55' legislative baseline. When applying the legally mandated −55% reduction target (relative to 1990 levels) strictly to the energy and industrial combustion sectors, the dashboard reveals that the EU average, along with several individual member states (e.g., Germany, Sweden), has mathematically *already exceeded* the 2030 milestone as of 2022. Because official European Environment Agency assessments confirm the EU as a whole is *not* on track, this visual paradox proves a profound policy reality: the energy sector's rapid decarbonization (driven by coal phase-outs and renewable scaling) is masking a severe, economy-wide Implementation Gap driven almost entirely by the stagnation of non-energy sectors, such as agriculture and land use, which were omitted from the combustion dataset.

### 5.4 Evaluation Limitations

Despite its analytical contributions, the evaluation identified several limitations:

1. **National-level granularity:** The reliance on national-level aggregated indicators obscures sub-national and regional disparities that are often significant in larger, federally structured countries like Germany (where the Energiewende has uneven regional effects) or Spain (where solar potential varies dramatically between regions).

2. **Temporal smoothing trade-off:** While the Consensus Clustering framework's 3-year rolling window and hysteresis mechanism provide essential long-term stability, they inherently impose a degree of rigidity. Sudden, short-term shocks—such as the 2022 energy crisis triggered by the Russia-Ukraine conflict—are mathematically dampened, potentially masking immediate policy reactions and crisis-response measures.

3. **Visual scalability:** Rendering 27 intertwined country trajectories on the Energy Trends Chart or the Transition Flow Chart can result in visual clutter if the user does not actively employ the filtering mechanisms (country selection, cluster filtering). While the CMV framework mitigates this through interactive filtering, the baseline "show-all" state remains dense.

4. **Absence of formal user study:** The evaluation relies on analytical case studies and system walkthroughs rather than a formal user study with recruited domain expert participants. While the case studies demonstrate the system's analytical capabilities, they do not provide empirical evidence of usability, learnability, or task completion efficiency. A controlled user study remains an important direction for future work.

5. **Static data scope:** The current system does not incorporate real-time data updates. The dataset is a snapshot (2010–2023), and integrating live Eurostat data feeds would enhance the system's ongoing relevance for policy monitoring.

## CHAPTER 6 Conclusion and Future Work

### 6.1 Conclusions

This thesis introduced a comprehensive visual analytics framework tailored for analyzing the European Union's energy transition from 2010 to 2023. The research addressed three identified challenges—temporal instability of clustering algorithms, disconnect between statistical clustering and policy interpretation, and fragmented visual representations—through the following contributions:

**Contribution 1: Stable Consensus Clustering Framework.** By transitioning from volatile year-by-year K-Means to a three-stage consensus architecture—global centroid computation from temporally aggregated country averages, hysteresis-based assignment rules (15% inter-centroid distance margin), and 3-year rolling-window feature smoothing—the system successfully extracts coherent, multi-year strategic pathways from a seven-dimensional energy feature space. Cross-validation against Hierarchical Clustering (Ward's method) and DBSCAN confirmed the mathematical robustness of the identified clusters, with convergent evidence from Silhouette Score, Davies-Bouldin Index, and Calinski-Harabasz Index supporting the four-cluster solution.

**Contribution 2: Integrated Economic-Climate Typology Matrix.** The 2×2 typology matrix, constructed via median-split on GDP per capita (PPS) and Heating Degree Days (HDD), bridges the gap between descriptive energy clustering and policy-relevant interpretation. By mapping energy clusters onto this socioeconomic scaffold, the system reveals that the pacing and success of a nation's energy transition are inextricably linked to its underlying economic capacity and structural climate context. The Typology Cross-Tab matrix and Cluster Context Profile components make this relationship visually explorable.

**Contribution 3: Comprehensive CMV Dashboard.** The implemented system integrates 20+ coordinated visualization components across five analytical views—including Choropleth Maps, PCA Biplots with convex hulls, cluster-ordered Z-score Heatmaps, Radar Charts, Temporal Line Charts, interactive Dendrograms, dual-mode Transition Flow Diagrams, Socioeconomic Scatter Plots, Cross-Tabulation Matrices, Sectoral Emissions Charts, and Goal Tracking Charts—within a unified interactive framework. The React Context-based interaction model ensures that selections, hover states, and cluster filters propagate seamlessly across all views, implementing the Coordinated Multiple Views paradigm (Roberts, 2007) and adhering to Shneiderman's (1996) "overview first, zoom and filter, then details-on-demand" mantra.

**Contribution 4: Built-in Methodological Transparency.** The dedicated Methodology View provides in-situ algorithmic cross-validation, enabling users to verify cluster robustness without leaving the analytical interface. This design choice embodies the principle that visual analytics tools should not merely present results but should also expose and justify the analytical process (Thomas & Cook, 2005).

The qualitative case studies—examining the Germany vs. Poland divergence, Nordic convergence, and France's nuclear outlier status—demonstrated that the system enables rich, multi-dimensional policy narratives that connect energy data patterns to underlying structural explanations.

### 6.2 Challenges and Limitations

Throughout the development and evaluation of this system, several technical and methodological challenges emerged:

- **Client-side computational constraints:** Executing PCA (via custom power iteration), UMAP (400 epochs), consensus K-Means (20 restarts), hierarchical clustering (O(n³) for n=27), and DBSCAN within the browser required careful performance optimization. The use of `useMemo` for all expensive computations, the `skipUMAP` flag for bulk year processing, and Vite's optimized bundling were essential for maintaining responsive interaction times.

- **Deterministic reproducibility:** Ensuring that cluster assignments are identical across page refreshes required explicit seeding strategies throughout—Mulberry32 PRNG for PCA, seed=42+run for K-Means restarts, and centroid sorting by renewable_share for label ordering.

- **National-level aggregation:** The reliance on national aggregates inherently obscures sub-national heterogeneity that is critical in larger, economically diverse member states.

- **Consensus clustering rigidity:** The hysteresis mechanism and rolling-window smoothing, while essential for temporal stability, inevitably dampen the visibility of acute, short-term shocks such as the 2022 energy crisis.

### 6.3 Future Work

Several promising avenues exist for extending this research:

1. **Sub-national granularity:** Incorporating NUTS-2 (regional) level data from Eurostat would provide substantially higher-resolution analysis, enabling investigation of intra-country disparities in energy transition progress.

2. **Predictive modeling and scenario simulation:** Integrating supervised learning or simulation capabilities—allowing users to adjust economic or policy variables and forecast future energy profiles—would transform the dashboard from a retrospective analytical tool into a proactive policy-planning instrument.

3. **Formal user evaluation:** Conducting a controlled user study with recruited students and educational researchers, measuring task completion time, accuracy, and perceived usefulness, would provide empirical validation of the system's usability beyond the analytical case studies presented here.

4. **Real-time data integration:** Connecting the dashboard to live Eurostat data feeds via their SDMX API would enable continuous monitoring of the energy transition, making the tool relevant for ongoing policy assessment rather than periodic retrospective analysis.

5. **Expanded geographic scope:** Extending the framework to include non-EU European nations (e.g., the United Kingdom, Norway, Switzerland) or even global coverage would enable broader comparative analysis of energy transition strategies across different governance frameworks.

6. **Advanced dimensionality reduction:** Exploring non-linear techniques beyond UMAP—such as t-SNE with perplexity tuning or PHATE for trajectory preservation—could enhance the scatter plot visualizations, particularly for revealing temporal evolution patterns in reduced space.
