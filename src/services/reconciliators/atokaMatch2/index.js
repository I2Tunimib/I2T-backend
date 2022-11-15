const relevantOpt = [{ 'id': '', 'label': ' ', 'value': '' },{ 'id': 'name', 'label': 'Atoka : name', 'value': 'name' }, { 'id': 'regNumbers', 'label': 'Atoka : regNumbers', 'value': 'regNumbers' },
{ 'id': 'websitesDomains', 'label': 'Atoka : websitesDomains', 'value': 'websitesDomains' }, { 'id': 'phones', 'label': 'Atoka : phones', 'value': 'phones' },
{ 'id': 'emails', 'label': 'Atoka : emails', 'value': 'emails' }, { 'id': 'socials', 'label': 'Atoka : socials', 'value': 'socials' }];

const optionalOpt = [{ 'id': '', 'label': ' ', 'value': '' }, { 'id': 'countries', 'label': 'Atoka : countries', 'value': 'countries' },
{ 'id': 'active', 'label': 'Atoka : active', 'value': 'active' }, { 'id': 'groupIds', 'label': 'Atoka : groupIds', 'value': 'groupIds' },
{ 'id': 'revenueRange', 'label': 'Atoka : revenueRange', 'value': 'revenueRange' }, { 'id': 'provinces', 'label': 'Atoka : provinces', 'value': 'provinces' },
{ 'id': 'municipalities', 'label': 'Atoka : municipalities', 'value': 'municipalities' },
{ 'id': 'postcodes', 'label': 'Atoka : postcodes', 'value': 'postcodes' }, { 'id': 'address', 'label': 'Atoka : address', 'value': 'address' },
{ 'id': 'useFullAddress', 'label': 'Atoka : useFullAddress', 'value': 'useFullAddress' }];



const servicesDescription = '<br>This external service is used to find the match between: <br> <b style="color: #3498db ; font-size: 25px;">Atoka</b> → companies in the knowledge graph.<br><b style="color: #FF5733; font-size: 25px;">Source</b> → data contained in the table<br><br><hr style="width:108%; border:1px solid #e0e0e0;">';


const firstDescription = '<h2>First</h2>The selected column in the Source table will be compared with the selected <b style="color: #3498db; font-size: 20px;">Atoka</b> filter:<br>';

const relevantDescription = '<br><h1>Relevant Filters</h1>  in this section is possible to set up the relevant filter, important filter in the Atoka service which requires the use of at least one.<br><br><b>N.B</b> The selected column in the table contains data to use with the relevant filter. <br><br><hr style="width:105%; border:1px solid #e0e0e0;">';


const optionalDescription = '<br><hr style="width:105%; border:1px solid #e0e0e0;"><br> <h1>Optional Filters</h1> <br> in this section is possible to set up the optional filters, filters used for a greater precision in the match operation, but without usage costraints. <br><br>';

function sourceDescription(filterName) {
  return  'after the choice of '+ filterName + ' filter, you can select the <b style="color: #FF5733; font-size: 20px;">Source</b> column with the data:';
}

function atokaDescription(filterName) {
  return '<hr style="width:105%; border:1px solid #e0e0e0;"> <h2>' + filterName + '</h2> Select the <b style="color: #3498db; font-size: 20px;">Atoka</b> filter to use in the match:';
}

function atokaSelect(id, description, options) {
  return {
    id: id,
    description: description,
    label: "Atoka",
    infoText: "",
    inputType: 'select',
    rules: [],
    options: options
  }
}

function sourceSelect(id, description) {
  return {
    id: id,
    description: description,
    label: 'Source',
    infoText: '',
    inputType: 'selectColumns',
    rules: []
  }
}

export default {
  private: {
    endpoint: process.env.ATOKA_MATCH,
    access_token: process.env.ATOKA_TOKEN,
    processRequest: true,
    min_threshold: 0.6
  },
  public: {
    name: 'Atoka Match',
    description: '',
    relativeUrl: '/atoka',
    prefix: 'atoka',
    uri: 'https://atoka.io/public/en/company/-/',
    metaToView: {
      id: {
        label: 'ID',
      },
      name: {
        label: 'Name',
        type: 'link'
      },
      score: {
        label: 'Score'
      },
      type: {
        label: 'Types',
        type: 'subList'
      },
      match: {
        label: 'Match',
        type: 'tag'
      }
    },
    formParams: [
      {
        id: 'atokaFirstRel',
        description: servicesDescription + relevantDescription + firstDescription,
        label: "Atoka",
        infoText: "",
        inputType: 'select',
        rules: ['required'],
        options: relevantOpt
      },


      atokaSelect('atokaSecondRel', atokaDescription('Second'), relevantOpt),

      sourceSelect('SecondRel', sourceDescription('Second')),

      atokaSelect('atokaThirdRel', atokaDescription('Third'), relevantOpt),

      sourceSelect('ThirdRel', sourceDescription('Third')),

      atokaSelect('atokaFourthRel', atokaDescription('Fourth'), relevantOpt),

      sourceSelect('FourthRel', sourceDescription('Fourth')),

      atokaSelect('atokaFirstOpt', optionalDescription + atokaDescription('First Opt'), optionalOpt),

      sourceSelect('FirstOpt', sourceDescription('First Opt')),

      atokaSelect('atokaSecondOpt', atokaDescription('Second Opt'), optionalOpt),

      sourceSelect('SecondOpt', sourceDescription('Second Opt'))
    ]
  }
}