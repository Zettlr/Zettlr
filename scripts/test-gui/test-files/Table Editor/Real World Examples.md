# Real World Table test

This file includes some tables that have been created as a real world example.
This allows testing for proper table editor behavior in real-world use cases.

| Description                   | Topics | Alpha | Beta    | Perplexity | Cohesiveness | Exclusivity |
|-------------------------|--------|-------|---------|------------|----------------|---------------|
| DiMaggio, Nag and Blei (2013) | 12     | 0.1   | 0.08    | 2938.22    | -10914.64    | 72.8%       |
| Maier et al. (2020)           | 50     | 0.5   | 0.02    | 331241.36  | -9768.32     | 80.41%      |
| Gerow et al. (2018)           | 500    | 0.002 | 0.00083 | 3.15e+52   | -8764.58     | 19.03%      |
| Our Model                     | 500    | 0.5   | 0.1     | 5425.03    | -10984.49    | 24.99%      |

: Evaluation results for training a topic model on 10 % of the corpus using various combinations of the required hyperparameters for LDA. {#tbl:table2.3}

| Topic | Top 10 words (stemmed)                                                                               | Interpretation                                                      |
|-----------|------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------|
| 11     | exchang	merit	specul	futur	byproduct	hydrogen	committeereport	without	demerit	question                   | Financial discussions (exchanges, hedging, speculation)                                   |
| 31    | remedi	2008	hunt	reopen	courthous	unfit	fairer	maim	fair	thrash                          | Includes appropriations, also in the context of the 2008 financial crisis                                 |
| 64    | assess	trust	perpetu	leas	accru	insult	valuat	unjustifi	proprietor	virtual         | Seems to be Modern Monetary Theory (MMT)             |
| 98    | wage	children	pilot	segment	crippl	industri	eleven	textil	economi	asylum              | Trade agreements and foreign trading       |
| 119   | taxpay	corpor	pai	exempt	taxat	equiti	deduct	tax	estat	treasuri | Income tax discussions                                                  |
| 143   | competit	compet	competitor	broke	driven	econom	elimin	repos	solitari	advantag          | Tax evasion, price fixing and monopolies; unethical business practices in general; contains frequent references to the Clayton Antitrust Act |
| 355   | save	deposit	endors	insur	treasur	multipl	reconcil	gift	itand	depositori                             | Individual savings via the USPS and (later) bank deposits                                                |
| 466   | 1986	object	think	question	grammrudmanhol	believ	plow	grammrudman	amend	without         | Gramm-Rudman-Hollings Act                                                 |
| 488   | dollar	billion	million	deficit	expenditur	annual	hundr	spent	estim	revenu          | Military spending/Defense budget              |

: Economic topics of the senate model. {#tbl:table2.4}


| Topic | Top 10 words (stemmed)                                                                               | Interpretation                                                      |
|-----------|------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------|
| 22     | loan	provid	fund	question	think	invest	treasuri	countri	guarante	payment                   | Discussion of (rural/student) loans and bonds                                   |
| 39    | employ	emploi	salari	wage	labor	employe	faith	work	faithfulli	civilservic                          | USPS and federal work in general, wages/labor rights, etc.                                 |
| 43    | infrastructur	fund	appropri	unexpend	question	object	avail	think	provid	reappropri         |Appropriation bill discussions             |
| 58    | budget	estim	supplement	reduc	expenditur	budgetari	item	fund	economi	recommend                        | This is the House's main appropriation/budget topic                                                   |
| 59    | urgent	defici	promptli	benchmark	need	frankli	think	fund	support	countri              | Also appropriations/government budget, but with emphasis on debt and spending/restricting       |
| 76   | taxpay	realiti	burden	pocket	judgment	retroact	dollar	impractic	creation	reform | Again appropriations, but with significant Republican part demanding government spending cuts                                                  |
| 77   | recess	unemploy	exhaust	weekend	1980	economi	reintroduc	creat	benefit	million          | Unemployment securities, also recession/government debt around the economic crises of the 1970s |
| 101   | taxat	deduct	tax	deriv	levi	fiscal	collect	impos	collector	tripl                             | Taxation discussions                                                |
| 196   | deficit	classifi	let	postmast	ingenu	grammrudman	dutiabl	thebil	economi	fourthclass         | This topic includes the Gramm-Rudman-Hollings Act and the so-called Panetta budget                                                 |
| 226   | accid	benefici	reconsider	taxpai	softwar	think	believ	million	question	result          | Social securities/minimum wage              |
| 393   | discret	mandatori	omnibu	spend	forefront	theoret	fiftythird	forcefulli	provis	provid                        | Discretionary/mandatory spending, Omnibus bills                     |
| 403   | lower	lowincom	powerless	bracket	appendix	provid	million	boomer	save	support            | Tax cuts                                   |
| 408   | fulfil	crucial	wholesal	retrench	last	payasyougo	stale	romania	provid	cushion              | Revenue bills; PAYGO scheme/sequestering                                          |

: Economic topics of the house model. {#tbl:table2.5}

***

End of document.
