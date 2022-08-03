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
        id: 'atokaName',
        description: '<br>Questo servizio viene utilizzato per trovare la corrispondenza tra:<br><b style="color: #FF5733; font-size: 25px;">Source</b> → dati presenti nella tabella <br> <b style="color: #3498db ; font-size: 25px;">Atoka</b> → aziende presenti nella base di dati.<br><br><hr style="width:108%; border:1px solid #e0e0e0;"> <h2>name</h2>La colonna selezionata nella tabella Source verrà matchata con <b style="color: #3498db; font-size: 20px;">Atoka</b>:',
        label: "Atoka",
        infoText: "",
        inputType: 'select',
        rules: ['required'],
        options: [{ 'id': 'name', 'label': 'Atoka : name', 'value': 'value' }]
      },


      {
        id: 'regNumbers',
        description: '<hr style="width:105%"> <br><h1>Relevant Filters</h1>  di seguito è possibile configurare i relevant filter, filtri importanti all\'interno del servizio che richiede l\'utilizzo di almeno uno di questi (name compreso). <br><br><hr style="width:105%; border:1px solid #e0e0e0;"><h2>regNumbers</h2>Per utilizzare il filtro regNumbers selezionare la colonna <b style="color: #FF5733; font-size: 20px;">Source</b>:',
        label: 'Source : regNumbers',
        infoText: '',
        inputType: 'selectColumns',
        rules: []
      },
      {
        id: 'atokaRegNumber',
        description: 'che verrà matchata con <b style="color: #3498db; font-size: 20px;">Atoka</b>:',
        label: "Atoka",
        infoText: "",
        inputType: 'select',
        rules: ['required'],
        options: [{ 'id': 'name', 'label': 'Atoka : regNumbers', 'value': 'value' }]
      },




      {
        id: 'websitesDomains',
        description: '<hr style="width:112%; border:1px solid #e0e0e0;"> <h2>websitesDomains</h2>Per utilizzare il filtro websitesDomains selezionare la colonna <b style="color: #FF5733; font-size: 20px;">Source</b>:',
        label: 'Source : websitesDomains',
        infoText: '',
        inputType: 'selectColumns',
        rules: []
      },
      {
        id: 'atokaWebsitesDomains',
        description: 'che verrà matchata con <b style="color: #3498db; font-size: 20px;">Atoka</b>:',
        label: "Atoka",
        infoText: "",
        inputType: 'select',
        rules: ['required'],
        options: [{ 'id': 'name', 'label': 'Atoka : websitesDomains', 'value': 'value' }]
      },






      {
        id: 'phones',
        description: '<hr style="width:132%; border:1px solid #e0e0e0;"> <h2>phones</h2>Per utilizzare il filtro phones selezionare la colonna <b style="color: #FF5733; font-size: 20px;">Source</b>:',
        label: 'Source : phones',
        infoText: '',
        inputType: 'selectColumns',
        rules: []
      },
      {
        id: 'atokaPhones',
        description: 'che verrà matchata con <b style="color: #3498db; font-size: 20px;">Atoka</b>:',
        label: "atoka",
        infoText: "",
        inputType: 'select',
        rules: ['required'],
        options: [{ 'id': 'name', 'label': 'Atoka : phones', 'value': 'value' }]
      },



      {
        id: 'emails',
        description: '<hr style="width:134%; border:1px solid #e0e0e0;"> <h2>emails</h2>Per utilizzare il filtro emails selezionare la colonna <b style="color: #FF5733; font-size: 20px;">Source</b>:',
        label: 'Source : emails',
        infoText: '',
        inputType: 'selectColumns',
        rules: []
      },
      {
        id: 'atokaEmails',
        description: 'che verrà matchata con <b style="color: #3498db; font-size: 20px;">Atoka</b>:',
        label: "Atoka",
        infoText: "",
        inputType: 'select',
        rules: ['required'],
        options: [{ 'id': 'name', 'label': 'Atoka : emails', 'value': 'value' }]
      },



      {
        id: 'socials',
        description: '<hr style="width:132%; border:1px solid #e0e0e0;"> <h2>socials</h2>Per utilizzare il filtro socials selezionare la colonna <b style="color: #FF5733; font-size: 20px;">Source</b>:',
        label: 'Source : socials',
        infoText: '',
        inputType: 'selectColumns',
        rules: []
      },
      {
        id: 'atokaSocials',
        description: 'che verrà matchata con <b style="color: #3498db; font-size: 20px;">Atoka</b>:',
        label: "Atoka",
        infoText: "",
        inputType: 'select',
        rules: ['required'],
        options: [{ 'id': 'name', 'label': 'Atoka : socials', 'value': 'value' }]
      },




      {
        id: 'opt1',
        description: '<hr style="width:105%"> <h1>Optional Filters</h1> <br> di seguito è possibile configurare gli optional filter, filtri che permettono di essere più precisi nella ricerca, ma che non hanno vincoli di utilizzo. <br><br><hr style="width:105%; border:1px solid #e0e0e0;"><h2>Optional 1</h2>Per utilizzare il primo filtro opzionale selezionare la colonna <b style="color: #FF5733; font-size: 20px;">Source</b>:',
        label: 'Source : Optional 1',
        infoText: '',
        inputType: 'selectColumns',
        rules: []
      },

      {
        id: 'optField1',
        description: 'che verrà matchata con <b style="color: #3498db; font-size: 20px;">Atoka</b>:',
        label: "Atoka : Optional 1",
        infoText: "",
        inputType: 'select',
        rules: [],
        options: [{ 'id': '', 'label': 'Atoka : Optional 1', 'value': '' },{ 'id': 'countries', 'label': 'Atoka : countries', 'value': 'countries' }, { 'id': 'active', 'label': 'Atoka : active', 'value': 'active' },
        { 'id': 'groupIds', 'label': 'Atoka : groupIds', 'value': 'groupIds' }, { 'id': 'revenueRange', 'label': 'Atoka : revenueRange', 'value': 'revenueRange' },
        { 'id': 'provinces', 'label': 'Atoka : provinces', 'value': 'provinces' }, { 'id': 'municipalities', 'label': 'Atoka : municipalities', 'value': 'municipalities' },
        { 'id': 'postcodes', 'label': 'Atoka : postcodes', 'value': 'postcodes' }, { 'id': 'address', 'label': 'Atoka : address', 'value': 'address' },
        { 'id': 'useFullAddress', 'label': 'Atoka : useFullAddress', 'value': 'useFullAddress' }]
      },





      {
        id: 'opt2',
        description: '<hr style="width:217%; border:1px solid #e0e0e0;"> <h2>Optional 2</h2>Per utilizzare il secondo filtro opzionale selezionare la colonna <b style="color: #FF5733; font-size: 20px;">Source</b>:',
        label: 'Source : Optional 2',
        infoText: '',
        inputType: 'selectColumns',
        rules: []
      },
      {
        id: 'optField2',
        description: 'che verrà matchata con <b style="color: #3498db; font-size: 20px;">Atoka</b>:',
        label: "Atoka : Optional 2",
        infoText: "",
        inputType: 'select',
        rules: [],
        options: [{ 'id': '', 'label': 'Atoka : Optional 2', 'value': '' },{ 'id': 'countries', 'label': 'Atoka : countries', 'value': 'countries' }, { 'id': 'active', 'label': 'Atoka : active', 'value': 'active' },
        { 'id': 'groupIds', 'label': 'Atoka : groupIds', 'value': 'groupIds' }, { 'id': 'revenueRange', 'label': 'Atoka : revenueRange', 'value': 'revenueRange' },
        { 'id': 'provinces', 'label': 'Atoka : provinces', 'value': 'provinces' }, { 'id': 'municipalities', 'label': 'Atoka : municipalities', 'value': 'municipalities' },
        { 'id': 'postcodes', 'label': 'Atoka : postcodes', 'value': 'postcodes' }, { 'id': 'address', 'label': 'Atoka : address', 'value': 'address' },
        { 'id': 'useFullAddress', 'label': 'Atoka : useFullAddress', 'value': 'useFullAddress' }]
      },
    ]
  }
}