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


export default {
  private: {
    endpoint: process.env.ATOKA_PEOPLE,
    access_token: process.env.ATOKA_TOKEN,
    processRequest: false,
    min_threshold: 0.6
  },
  public: {
    name: 'Atoka People Match',
    description: '',
    relativeUrl: '/atokaPeople',
    prefix: 'atokaPeople',
    uri: 'https://atoka.io/it/people/',
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
    formSchema:{
      firstFilter: {
        title: "<h2>Starting Filter</h2>",
        description: "Select the <b style='color: #3498db ; font-size: 20px;'>type</b> of data in the table column.",
        component: "group",
        dynamic: false,
        fields : {
          column: {
            label : "Table Column",
            component: "select",
            rules: ['required'],
            options: [{ 'id': 'colonnaSpec', 'label': 'Selected Column', 'value': 'selected_column' }]
          },
          type: {
            label: "Data Type",
            component: "select",
            rules: ['required'],
            options: generalInfo
          }
        }
      },
      generalInfoFilter: {
        title: "<h2>General Info Filter</h2>",
        description: "<br>In this section is possible to set up the filters to use in the people search operation.<br><br><b>N.B</b> The selected column in the table contains data to use with first filter. <br><br><hr style='width:105%; border:1px solid #e0e0e0;'>",
        component: "group",
        dynamic: true,
        fields : {
          column: {
            label : "Table Column",
            component: "selectColumns"
          },
          type: {
            label: "Data Type",
            component: "select",
            options: generalInfo
          }
        }
      },
      locationFilter: {
        title: "<h2>Location Filter</h2>",
        component: "group",
        description: 'In this section is possible to set up the location filters, location constraints to for a greater precision in the search operation.',
        dynamic: true,
        fields : {
          column: {
            label : "Table Column",
            component: "selectColumns"
          },
          type: {
            label: "Data Type",
            component: "select",
            options: location
          }
        }
      },
      companyFilter: {
        title: "<h2>Company Filter</h2>",
        component: "group",
        description: 'In this section is possible to set up the company filters, company constraints to for a greater precision in the search operation.',
        dynamic: true,
        fields : {
          column: {
            label : "Table Column",
            component: "selectColumns"
          },
          type: {
            label: "Data Type",
            component: "select",
            options: company
          }
        }
      }
    }
  }
}