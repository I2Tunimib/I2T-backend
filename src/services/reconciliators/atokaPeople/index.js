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

const servicesDescription = '<br>Questo servizio viene utilizzato per trovare la corrispondenza tra: <br> <b style="color: #3498db ; font-size: 25px;">Atoka</b> → persone presenti nella base di dati.<br><b style="color: #FF5733; font-size: 25px;">Source</b> → dati presenti nella tabella<br><br><hr style="width:108%; border:1px solid #e0e0e0;">';

const firstDescription = '<h2>First</h2>La colonna selezionata nella tabella Source sarà confrontata con il filtro <b style="color: #3498db; font-size: 20px;">Atoka</b> selezionato:<br>';

const relevantDescription = '<br>Di seguito è possibile configurare i filtri da utilizzare per la ricerca della persona desiderata. <br><br><b>N.B</b> La colonna selezionata in tabella contiene i dati da utilizzare con il filtro First. <br><br><hr style="width:105%; border:1px solid #e0e0e0;">';

const locationDescription = '<br><hr style="width:105%; border:1px solid #e0e0e0;"><br> <h1>Location Filters</h1> <br> di seguito è possibile configurare i location filter, filtri che permettono di includere vincoli di location nella ricerca.<br><br>';


function sourceDescription(filterName) {
  return  'dopo aver scelto il '+ filterName + ' filtro selezionare la colonna <b style="color: #FF5733; font-size: 20px;">Source</b> che contiene i dati:';
}

function atokaDescription(filterName) {
  return '<hr style="width:105%; border:1px solid #e0e0e0;"> <h2>' + filterName + '</h2> Selezionare il filtro <b style="color: #3498db; font-size: 20px;">Atoka</b> che si vuole utilizzare:';
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


    ]
  }
}