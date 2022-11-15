const generalInfo = [{ 'id': '', 'label': ' ', 'value': '' },
{ 'id': 'countries', 'label': 'Atoka : countries', 'value': 'countries' }, 
{ 'id': 'cervedIds', 'label': 'Atoka : cervedIds', 'value': 'cervedIds' },
{ 'id': 'name', 'label': 'Atoka : name', 'value': 'name' }, 
{ 'id': 'givenName', 'label': 'Atoka : givenName', 'value': 'givenName' },
{ 'id': 'familyName', 'label': 'Atoka : familyName', 'value': 'familyName' },
{ 'id': 'gender', 'label': 'Atoka : gender', 'value': 'gender' },
{ 'id': 'taxIds', 'label': 'Atoka : taxIds', 'value': 'taxIds' },
{ 'id': 'ageMin', 'label': 'Atoka : ageMin', 'value': 'ageMin' },
{ 'id': 'ageMax', 'label': 'Atoka : ageMax', 'value': 'ageMax' },
{ 'id': 'birthDateFrom', 'label': 'Atoka : birthDateFrom', 'value': 'birthDateFrom' },
{ 'id': 'birthDateTo', 'label': 'Atoka : birthDateTo', 'value': 'birthDateTo' },
{ 'id': 'relatedTo', 'label': 'Atoka : relatedTo', 'value': 'relatedTo' }];


const location = [{ 'id': '', 'label': ' ', 'value': '' },
{ 'id': 'residenceMacroregions', 'label': 'Atoka : residenceMacroregions', 'value': 'residenceMacroregions' }, 
{ 'id': 'residenceRegions', 'label': 'Atoka : residenceRegions', 'value': 'residenceRegions' },
{ 'id': 'residenceProvinces', 'label': 'Atoka : residenceProvinces', 'value': 'residenceProvinces' }, 
{ 'id': 'residenceMunicipalities', 'label': 'Atoka : residenceMunicipalities', 'value': 'residenceMunicipalities' },
{ 'id': 'residencePostcodes', 'label': 'Atoka : residencePostcodes', 'value': 'residencePostcodes' },
{ 'id': 'residenceStates', 'label': 'Atoka : residenceStates', 'value': 'residenceStates' },
{ 'id': 'addressMacroregions', 'label': 'Atoka : addressMacroregions', 'value': 'addressMacroregions' },
{ 'id': 'addressRegions', 'label': 'Atoka : addressRegions', 'value': 'addressRegions' },
{ 'id': 'addressProvinces', 'label': 'Atoka : addressProvinces', 'value': 'addressProvinces' },
{ 'id': 'addressMunicipalities', 'label': 'Atoka : addressMunicipalities', 'value': 'addressMunicipalities' },
{ 'id': 'addressPostcodes', 'label': 'Atoka : addressPostcodes', 'value': 'addressPostcodes' },
{ 'id': 'addressStates', 'label': 'Atoka : addressStates', 'value': 'addressStates' }];


const company = [{ 'id': '', 'label': ' ', 'value': '' },
{ 'id': 'companies', 'label': 'Atoka : companies', 'value': 'companies' }]

const servicesDescription = '<br>This external service is used to find the match between: <br> <b style="color: #3498db ; font-size: 25px;">Atoka</b> → people in the knowledge graph.<br><b style="color: #FF5733; font-size: 25px;">Source</b> → data contained in the table<br><br><hr style="width:108%; border:1px solid #e0e0e0;">';

const firstDescription = '<h2>First</h2>The selected column in the Source table will be compared with the selected <b style="color: #3498db; font-size: 20px;">Atoka</b> filter:<br>';

const relevantDescription = '<br>In this section is possible to set up the filters to use in the people search operation.<br><br><b>N.B</b> The selected column in the table contains data to use with first filter. <br><br><hr style="width:105%; border:1px solid #e0e0e0;">';

const locationDescription = '<br><hr style="width:105%; border:1px solid #e0e0e0;"><br> <h1>Location Filters</h1> <br> in this section is possible to set up the location filters, location constraints to for a greater precision in the search operation.<br><br>';

const companyDescription = '<br><hr style="width:105%; border:1px solid #e0e0e0;"><br> <h1>Company Filters</h1> <br> in this section is possible to set up the company filters, company constraints to for a greater precision in the search operation.<br><br>';


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
    endpoint: process.env.ATOKA_PEOPLE,
    access_token: process.env.ATOKA_TOKEN,
    processRequest: true,
    min_threshold: 0.6
  },
  public: {
    name: 'Atoka People',
    description: '',
    relativeUrl: '/atokaPeople',
    prefix: 'atokaPeople',
    uri: 'https://atoka.io/public/en/people/-/',
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
        options: generalInfo
      },


      atokaSelect('atokaSecondRel', atokaDescription('Second'), generalInfo),

      sourceSelect('SecondRel', sourceDescription('Second')),

      atokaSelect('atokaThirdRel', atokaDescription('Third'), generalInfo),

      sourceSelect('ThirdRel', sourceDescription('Third')),

      atokaSelect('atokaFourthRel', atokaDescription('Fourth'), generalInfo),

      sourceSelect('FourthRel', sourceDescription('Fourth')),

      atokaSelect('atokaFiveRel', locationDescription + atokaDescription('First'), location),

      sourceSelect('FiveRel', sourceDescription('First')),

      atokaSelect('atokaSixRel', atokaDescription('Second'), location),

      sourceSelect('SixRel', sourceDescription('Second')),
      
      atokaSelect('atokaSevRel', companyDescription + atokaDescription('First'), company),

      sourceSelect('SevRel', sourceDescription('First')),


    ]
  }
}